import type {
  CopyTrainingRequest,
  CreateExerciseSetRequest,
  CreateTrainingExerciseRequest,
  CreateTrainingRequest,
  ExerciseSet,
  ExerciseSetHistoryItem,
  ExerciseType,
  Training,
  TrainingCategory,
  TrainingDetail,
  TrainingExercise,
  UpdateExerciseSetRequest,
  UpdateTrainingExerciseRequest,
  UUID,
} from '../types/api';
import { demoExerciseTypes, type DemoExerciseTypeRecord } from './catalog';
import { createDemoSeed } from './seed';

/** A training exercise as stored by the demo backend: normalized, referencing its type by id. */
export type DemoExerciseRecord = Omit<TrainingExercise, 'exerciseType' | 'sets'> & { exerciseTypeId: UUID };

export type DemoState = {
  version: typeof DEMO_STATE_VERSION;
  trainings: Training[];
  exercises: DemoExerciseRecord[];
  sets: ExerciseSet[];
};

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type DemoBackendOptions = {
  /** Where to persist demo data between page reloads. `null` keeps everything in memory. */
  storage?: StorageLike | null;
  storageKey?: string;
  now?: () => Date;
  createId?: () => string;
  /** Builds the initial data set. Defaults to the bundled sample workouts. */
  seed?: (context: { today: Date; createId: () => string }) => DemoState;
};

export const DEMO_STATE_VERSION = 1;
export const DEFAULT_DEMO_STORAGE_KEY = 'glorfex-demo-state';

/** Mirrors the backend's error payload (`ApiError`) and HTTP status. */
export class DemoApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details: string[] = []
  ) {
    super(message);
    this.name = 'DemoApiError';
  }
}

const trainingCategories: TrainingCategory[] = ['WHOLE_BODY', 'LEGS', 'UPPER_BODY'];

/**
 * In-memory stand-in for the exercise REST API, used by `npm run dev:demo`.
 * Method names and payloads match `exerciseApi` so the UI behaves exactly as with the real backend.
 */
export class DemoBackend {
  private state: DemoState;
  private readonly storage: StorageLike | null;
  private readonly storageKey: string;
  private readonly now: () => Date;
  private readonly createId: () => string;
  private readonly seed: NonNullable<DemoBackendOptions['seed']>;
  private readonly exerciseTypes = new Map<UUID, DemoExerciseTypeRecord>(demoExerciseTypes.map((type) => [type.id, type]));

  constructor(options: DemoBackendOptions = {}) {
    this.storage = options.storage ?? null;
    this.storageKey = options.storageKey ?? DEFAULT_DEMO_STORAGE_KEY;
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? createUuid;
    this.seed = options.seed ?? createDemoSeed;
    this.state = this.readStoredState() ?? this.seedAndSave();
  }

  /** Discards all data and generates a fresh sample data set, e.g. when a user signs in. */
  reseed() {
    this.state = this.seedAndSave();
  }

  /** Re-reads persisted data, e.g. after another browser tab changed it. */
  reload() {
    this.state = this.readStoredState() ?? this.state;
  }

  // --- Trainings -----------------------------------------------------------------------------

  listTrainings(): Training[] {
    return [...this.state.trainings].sort(byTrainingDateDesc).map(clone);
  }

  getTraining(id: UUID): TrainingDetail {
    const training = this.findTraining(id);
    return {
      training: clone(training),
      exercises: this.exercisesOf(training.id).map((exercise) => this.toTrainingExercise(exercise)),
    };
  }

  createTraining(body: CreateTrainingRequest): Training {
    validate([
      ...trainingChecks(body),
      [isOptionalString(body?.note), 'note must be text'],
    ]);

    const timestamp = this.timestamp();
    const training: Training = {
      id: this.createId(),
      name: body.name.trim(),
      note: body.note ?? null,
      trainingDate: body.trainingDate,
      category: body.category,
      weight: body.weight ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.state.trainings.push(training);
    this.save();
    return clone(training);
  }

  /** Copies a training with all its exercises and sets, including their notes and ratings. */
  copyTraining(id: UUID, body: CopyTrainingRequest): Training {
    const source = this.findTraining(id);
    validate(trainingChecks(body));

    const timestamp = this.timestamp();
    const copy: Training = {
      id: this.createId(),
      name: body.name.trim(),
      note: source.note ?? null,
      trainingDate: body.trainingDate,
      category: body.category,
      weight: body.weight ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.state.trainings.push(copy);

    for (const exercise of this.exercisesOf(source.id)) {
      const exerciseCopy: DemoExerciseRecord = {
        ...exercise,
        id: this.createId(),
        trainingId: copy.id,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      this.state.exercises.push(exerciseCopy);

      for (const set of this.setsOf(exercise.id)) {
        this.state.sets.push({
          ...set,
          id: this.createId(),
          trainingExerciseId: exerciseCopy.id,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }

    this.save();
    return clone(copy);
  }

  deleteTraining(id: UUID): void {
    this.findTraining(id);
    const exerciseIds = new Set(this.state.exercises.filter((exercise) => exercise.trainingId === id).map((exercise) => exercise.id));
    this.state.sets = this.state.sets.filter((set) => !exerciseIds.has(set.trainingExerciseId));
    this.state.exercises = this.state.exercises.filter((exercise) => exercise.trainingId !== id);
    this.state.trainings = this.state.trainings.filter((training) => training.id !== id);
    this.save();
  }

  // --- Exercise types ------------------------------------------------------------------------

  listExerciseTypes(): ExerciseType[] {
    const counts = this.timesTrainedByType();
    return [...this.exerciseTypes.values()].map((type) => ({ ...type, timesTrained: counts.get(type.id) ?? 0 }));
  }

  listExerciseSetHistory(exerciseTypeId: UUID): ExerciseSetHistoryItem[] {
    if (!this.exerciseTypes.has(exerciseTypeId)) {
      throw new DemoApiError(404, 'Exercise type not found');
    }

    const trainingsById = new Map(this.state.trainings.map((training) => [training.id, training]));
    return this.state.exercises
      .filter((exercise) => exercise.exerciseTypeId === exerciseTypeId && trainingsById.has(exercise.trainingId))
      .flatMap((exercise) =>
        this.setsOf(exercise.id).map((set) => ({
          training: clone(trainingsById.get(exercise.trainingId)!),
          trainingExerciseId: exercise.id,
          exercisePosition: exercise.position,
          exerciseRating: exercise.rating ?? null,
          exerciseNote: exercise.note ?? null,
          set: clone(set),
        }))
      )
      .sort(
        (a, b) =>
          byTrainingDateDesc(a.training, b.training) ||
          a.exercisePosition - b.exercisePosition ||
          a.set.position - b.set.position
      );
  }

  // --- Training exercises --------------------------------------------------------------------

  addExercise(trainingId: UUID, body: CreateTrainingExerciseRequest): TrainingExercise {
    this.findTraining(trainingId);
    validate([
      [typeof body?.exerciseTypeId === 'string' && this.exerciseTypes.has(body.exerciseTypeId), 'exerciseTypeId must reference an existing exercise type'],
      ...exerciseChecks(body),
    ]);

    const timestamp = this.timestamp();
    const exercise: DemoExerciseRecord = {
      id: this.createId(),
      trainingId,
      exerciseTypeId: body.exerciseTypeId,
      position: body.position,
      note: body.note ?? null,
      rating: body.rating ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.state.exercises.push(exercise);
    this.touchTraining(trainingId, timestamp);
    this.save();
    return this.toTrainingExercise(exercise);
  }

  updateExercise(id: UUID, body: UpdateTrainingExerciseRequest): TrainingExercise {
    const exercise = this.findExercise(id);
    validate(exerciseChecks(body));

    const timestamp = this.timestamp();
    Object.assign(exercise, { position: body.position, note: body.note ?? null, rating: body.rating ?? null, updatedAt: timestamp });
    this.touchTraining(exercise.trainingId, timestamp);
    this.save();
    return this.toTrainingExercise(exercise);
  }

  deleteExercise(id: UUID): void {
    const exercise = this.findExercise(id);
    this.state.sets = this.state.sets.filter((set) => set.trainingExerciseId !== id);
    this.state.exercises = this.state.exercises.filter((item) => item.id !== id);
    // Keep positions contiguous so "next position = count + 1" in the UI stays correct.
    renumber(this.exercisesOf(exercise.trainingId));
    this.touchTraining(exercise.trainingId, this.timestamp());
    this.save();
  }

  // --- Sets ----------------------------------------------------------------------------------

  addSet(trainingExerciseId: UUID, body: CreateExerciseSetRequest): ExerciseSet {
    const exercise = this.findExercise(trainingExerciseId);
    validate(setChecks(body));

    const timestamp = this.timestamp();
    const set: ExerciseSet = {
      id: this.createId(),
      trainingExerciseId,
      position: body.position,
      repetitions: body.repetitions,
      weight: body.weight,
      rating: body.rating ?? null,
      note: body.note ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.state.sets.push(set);
    this.touchTraining(exercise.trainingId, timestamp);
    this.save();
    return clone(set);
  }

  updateSet(id: UUID, body: UpdateExerciseSetRequest): ExerciseSet {
    const set = this.findSet(id);
    validate(setChecks(body));

    const timestamp = this.timestamp();
    Object.assign(set, {
      position: body.position,
      repetitions: body.repetitions,
      weight: body.weight,
      rating: body.rating ?? null,
      note: body.note ?? null,
      updatedAt: timestamp,
    });
    this.touchTraining(this.findExercise(set.trainingExerciseId).trainingId, timestamp);
    this.save();
    return clone(set);
  }

  deleteSet(id: UUID): void {
    const set = this.findSet(id);
    this.state.sets = this.state.sets.filter((item) => item.id !== id);
    renumber(this.setsOf(set.trainingExerciseId));
    this.touchTraining(this.findExercise(set.trainingExerciseId).trainingId, this.timestamp());
    this.save();
  }

  // --- Internals -----------------------------------------------------------------------------

  private findTraining(id: UUID) {
    const training = this.state.trainings.find((item) => item.id === id);
    if (!training) throw new DemoApiError(404, 'Training not found');
    return training;
  }

  private findExercise(id: UUID) {
    const exercise = this.state.exercises.find((item) => item.id === id);
    if (!exercise) throw new DemoApiError(404, 'Training exercise not found');
    return exercise;
  }

  private findSet(id: UUID) {
    const set = this.state.sets.find((item) => item.id === id);
    if (!set) throw new DemoApiError(404, 'Exercise set not found');
    return set;
  }

  private exercisesOf(trainingId: UUID) {
    return this.state.exercises.filter((exercise) => exercise.trainingId === trainingId).sort(byPosition);
  }

  private setsOf(trainingExerciseId: UUID) {
    return this.state.sets.filter((set) => set.trainingExerciseId === trainingExerciseId).sort(byPosition);
  }

  private toTrainingExercise(record: DemoExerciseRecord): TrainingExercise {
    const { exerciseTypeId, ...exercise } = record;
    const type = this.exerciseTypes.get(exerciseTypeId);
    const exerciseType: ExerciseType = type
      ? { ...type, timesTrained: this.timesTrainedByType().get(type.id) ?? 0 }
      : { id: exerciseTypeId, code: 'UNKNOWN', name: 'Unknown exercise', category: null, timesTrained: 0, createdAt: record.createdAt, updatedAt: record.createdAt };
    return { ...clone(exercise), exerciseType, sets: this.setsOf(record.id).map(clone) };
  }

  private timesTrainedByType() {
    const counts = new Map<UUID, number>();
    for (const exercise of this.state.exercises) {
      counts.set(exercise.exerciseTypeId, (counts.get(exercise.exerciseTypeId) ?? 0) + 1);
    }
    return counts;
  }

  private touchTraining(id: UUID, timestamp: string) {
    this.findTraining(id).updatedAt = timestamp;
  }

  private timestamp() {
    return this.now().toISOString();
  }

  private seedAndSave() {
    this.state = this.seed({ today: this.now(), createId: this.createId });
    this.save();
    return this.state;
  }

  private readStoredState(): DemoState | null {
    try {
      const raw = this.storage?.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<DemoState>;
      const valid =
        parsed.version === DEMO_STATE_VERSION &&
        Array.isArray(parsed.trainings) &&
        Array.isArray(parsed.exercises) &&
        Array.isArray(parsed.sets);
      return valid ? (parsed as DemoState) : null;
    } catch {
      return null;
    }
  }

  private save() {
    try {
      this.storage?.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      // Storage can be full or blocked (e.g. private browsing); the demo keeps working in memory.
      console.warn('Demo mode: could not persist demo data', error);
    }
  }
}

// --- Validation (mirrors the backend's 400 responses) -------------------------------------------

type Check = [ok: boolean, message: string];

function validate(checks: Check[]) {
  const details = checks.filter(([ok]) => !ok).map(([, message]) => message);
  if (details.length > 0) {
    throw new DemoApiError(400, 'Validation failed', details);
  }
}

function trainingChecks(body: CreateTrainingRequest | CopyTrainingRequest | undefined): Check[] {
  return [
    [typeof body?.name === 'string' && body.name.trim().length > 0, 'name must not be blank'],
    [isIsoDate(body?.trainingDate), 'trainingDate must be a date in YYYY-MM-DD format'],
    [trainingCategories.includes(body?.category as TrainingCategory), `category must be one of ${trainingCategories.join(', ')}`],
    [body?.weight === undefined || body.weight === null || isNonNegativeNumber(body.weight), 'weight must be zero or positive'],
  ];
}

function exerciseChecks(body: UpdateTrainingExerciseRequest | undefined): Check[] {
  return [
    [isPositiveInteger(body?.position), 'position must be a positive whole number'],
    [isOptionalRating(body?.rating), 'rating must be between 1 and 3'],
    [isOptionalString(body?.note), 'note must be text'],
  ];
}

function setChecks(body: UpdateExerciseSetRequest | undefined): Check[] {
  return [
    [isPositiveInteger(body?.position), 'position must be a positive whole number'],
    [isPositiveInteger(body?.repetitions), 'repetitions must be a positive whole number'],
    [isNonNegativeNumber(body?.weight), 'weight must be zero or positive'],
    [isOptionalRating(body?.rating), 'rating must be between 1 and 3'],
    [isOptionalString(body?.note), 'note must be text'],
  ];
}

function isPositiveInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isNonNegativeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isOptionalRating(value: unknown) {
  return value === undefined || value === null || (typeof value === 'number' && [1, 2, 3].includes(value));
}

function isOptionalString(value: unknown) {
  return value === undefined || value === null || typeof value === 'string';
}

function isIsoDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

// --- Helpers -------------------------------------------------------------------------------------

function byPosition(a: { position: number; createdAt: string }, b: { position: number; createdAt: string }) {
  return a.position - b.position || a.createdAt.localeCompare(b.createdAt);
}

function byTrainingDateDesc(a: Training, b: Training) {
  return b.trainingDate.localeCompare(a.trainingDate) || b.createdAt.localeCompare(a.createdAt);
}

function renumber(items: Array<{ position: number }>) {
  items.forEach((item, index) => {
    item.position = index + 1;
  });
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

/** `crypto.randomUUID` only exists in secure contexts; the dev server is also reachable over plain http on the LAN. */
export function createUuid(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
