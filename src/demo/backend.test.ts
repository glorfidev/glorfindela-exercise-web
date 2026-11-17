import { beforeEach, describe, expect, it, vi } from 'vitest';
import { slovakExerciseName } from '../components/AddExerciseForm';
import { createUuid, DEFAULT_DEMO_STORAGE_KEY, DemoApiError, DemoBackend, type DemoBackendOptions, type DemoState, type StorageLike } from './backend';
import { demoExerciseTypeId, demoExerciseTypes } from './catalog';
import { createRandomService } from './random';
import { createDemoSeed } from './seed';

const benchPress = demoExerciseTypeId('BENCH_PRESS');
const squat = demoExerciseTypeId('SQUAT');
const today = new Date(2026, 2, 15, 9, 30);

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

function sequentialIds() {
  let next = 0;
  return () => `id-${++next}`;
}

const emptySeed = (): DemoState => ({ version: 1, trainings: [], exercises: [], sets: [] });

function backend(options: ConstructorParameters<typeof DemoBackend>[0] = {}) {
  return new DemoBackend({ now: () => today, createId: sequentialIds(), seed: emptySeed, ...options });
}

function expectApiError(action: () => unknown, status: number, details?: string[]) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(DemoApiError);
    expect((error as DemoApiError).status).toBe(status);
    if (details) expect((error as DemoApiError).details).toEqual(details);
    return;
  }
  throw new Error('Expected a DemoApiError');
}

/** A training with one bench press exercise holding three sets at positions 1..3. */
function withBenchSession(api = backend()) {
  const training = api.createTraining({ name: 'Push', trainingDate: '2026-03-10', category: 'UPPER_BODY', weight: 80 });
  const exercise = api.addExercise(training.id, { exerciseTypeId: benchPress, position: 1 });
  const sets = [1, 2, 3].map((position) => api.addSet(exercise.id, { position, repetitions: 10, weight: 50 + position * 5 }));
  return { api, training, exercise, sets };
}

describe('catalog', () => {
  it('offers every known exercise once, with a category and a Slovak name', () => {
    const codes = demoExerciseTypes.map((type) => type.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.length).toBeGreaterThan(150);
    for (const type of demoExerciseTypes) {
      expect(type.category).toBeTruthy();
      // slovakExerciseName falls back to `name` for unknown codes.
      expect(slovakExerciseName({ ...type, name: '<fallback>', timesTrained: 0 })).not.toBe('<fallback>');
    }
  });

  it('formats readable English names', () => {
    const names = Object.fromEntries(demoExerciseTypes.map((type) => [type.code, type.name]));
    expect(names).toMatchObject({ BENCH_PRESS: 'Bench Press', PULL_UP: 'Pull-Up', T_BAR_ROW: 'T-Bar Row', FARMERS_CARRY: "Farmer's Carry" });
  });
});

describe('generated sample data', () => {
  const generate = (seedValue: number) => createDemoSeed({ today, createId: sequentialIds(), random: createRandomService(seedValue) });

  it.each([1, 2, 3, 4, 5])('creates consistent, realistic workouts for seed %i', (seedValue) => {
    const seed = generate(seedValue);

    expect(seed.trainings.length).toBeGreaterThanOrEqual(8);
    const dates = seed.trainings.map((training) => training.trainingDate).sort();
    expect(dates[dates.length - 1] >= '2026-03-12').toBe(true); // newest within the last few days
    expect(dates[0] >= '2026-02-14').toBe(true); // oldest roughly four weeks back
    expect(dates[dates.length - 1] < '2026-03-15').toBe(true); // never in the future

    const trainingIds = new Set(seed.trainings.map((training) => training.id));
    const exerciseIds = new Set(seed.exercises.map((exercise) => exercise.id));
    const typeIds = new Set(demoExerciseTypes.map((type) => type.id));
    expect(seed.exercises.every((exercise) => trainingIds.has(exercise.trainingId) && typeIds.has(exercise.exerciseTypeId))).toBe(true);
    expect(seed.sets.every((set) => exerciseIds.has(set.trainingExerciseId))).toBe(true);

    for (const training of seed.trainings) {
      const positions = seed.exercises.filter((exercise) => exercise.trainingId === training.id).map((exercise) => exercise.position).sort((a, b) => a - b);
      expect(positions).toEqual(positions.map((_, index) => index + 1));
      expect(training.weight === null || (typeof training.weight === 'number' && training.weight >= 55 && training.weight <= 100)).toBe(true);
    }
    for (const set of seed.sets) {
      expect(set.repetitions).toBeGreaterThanOrEqual(1);
      expect(set.repetitions).toBeLessThanOrEqual(20);
      expect(set.weight).toBeGreaterThanOrEqual(0);
      expect(set.weight).toBeLessThanOrEqual(220);
      expect(set.rating === null || [1, 2, 3].includes(set.rating!)).toBe(true);
    }
  });

  it.each([1, 2, 3, 4, 5])('covers empty and optional UI states for seed %i', (seedValue) => {
    const seed = generate(seedValue);
    expect(seed.trainings.some((training) => training.weight === null)).toBe(true);
    expect(seed.trainings.some((training) => training.note)).toBe(true);
    expect(seed.exercises.some((exercise) => exercise.note) && seed.exercises.some((exercise) => exercise.rating)).toBe(true);
    expect(seed.exercises.some((exercise) => !seed.sets.some((set) => set.trainingExerciseId === exercise.id))).toBe(true);
    expect(seed.sets.some((set) => set.rating) && seed.sets.some((set) => set.note)).toBe(true);
  });

  it.each([1, 2, 3, 4, 5])('progressively overloads the anchor lifts for seed %i', (seedValue) => {
    const seed = generate(seedValue);
    const trainingsById = new Map(seed.trainings.map((training) => [training.id, training]));
    const weightsByType = new Map<string, Array<[string, number]>>();
    for (const exercise of seed.exercises) {
      for (const set of seed.sets.filter((item) => item.trainingExerciseId === exercise.id)) {
        const dated = weightsByType.get(exercise.exerciseTypeId) ?? [];
        dated.push([trainingsById.get(exercise.trainingId)!.trainingDate, set.weight]);
        weightsByType.set(exercise.exerciseTypeId, dated);
      }
    }
    const progressing = [...weightsByType.values()].filter((dated) => {
      const sorted = [...dated].sort(([a], [b]) => a.localeCompare(b));
      return sorted[sorted.length - 1][1] > sorted[0][1];
    });
    expect(progressing.length).toBeGreaterThanOrEqual(3); // at least the anchor of each category
  });

  it('is deterministic per seed and differs between seeds', () => {
    expect(generate(1)).toEqual(generate(1));
    const [a, b] = [generate(1), generate(2)];
    const summarize = (seed: typeof a) => seed.trainings.map(({ name, trainingDate, weight }) => [name, trainingDate, weight]);
    expect(summarize(a)).not.toEqual(summarize(b));
  });

  it('is served by default and replaced on reseed', () => {
    const api = new DemoBackend({ now: () => today });
    const before = api.listTrainings();
    expect(before.length).toBeGreaterThanOrEqual(8);
    const someType = api.listExerciseTypes().find((type) => type.timesTrained > 1)!;
    expect(api.listExerciseSetHistory(someType.id).length).toBeGreaterThan(0);

    api.reseed();
    const after = api.listTrainings();
    expect(after.length).toBeGreaterThanOrEqual(8);
    expect(after.map((training) => training.id)).not.toEqual(before.map((training) => training.id));
  });
});

describe('trainings', () => {
  it('creates, lists newest first and deletes with all exercises and sets', () => {
    const { api, training, sets } = withBenchSession();
    const older = api.createTraining({ name: ' Legs ', trainingDate: '2026-03-01', category: 'LEGS', weight: null, note: 'Easy' });
    expect(older).toMatchObject({ name: 'Legs', note: 'Easy', weight: null, createdAt: today.toISOString() });
    expect(api.listTrainings().map((item) => item.id)).toEqual([training.id, older.id]);

    api.deleteTraining(training.id);
    expect(api.listTrainings().map((item) => item.id)).toEqual([older.id]);
    expect(api.listExerciseSetHistory(benchPress)).toEqual([]);
    expectApiError(() => api.updateSet(sets[0].id, { position: 1, repetitions: 1, weight: 1 }), 404);
    expectApiError(() => api.getTraining(training.id), 404);
    expectApiError(() => api.deleteTraining(training.id), 404);
  });

  it('returns exercises and sets ordered by position', () => {
    const { api, training, exercise, sets } = withBenchSession();
    const first = api.addExercise(training.id, { exerciseTypeId: squat, position: 0 + 1 });
    api.updateExercise(exercise.id, { position: 2 });
    api.updateSet(sets[0].id, { position: 4, repetitions: 8, weight: 55 });

    const detail = api.getTraining(training.id);
    expect(detail.exercises.map((item) => item.id)).toEqual([first.id, exercise.id]);
    expect(detail.exercises[1].sets.map((set) => set.id)).toEqual([sets[1].id, sets[2].id, sets[0].id]);
    expect(detail.exercises[1].exerciseType).toMatchObject({ code: 'BENCH_PRESS', timesTrained: 1 });
  });

  it('rejects invalid trainings with all validation details', () => {
    const api = backend();
    expectApiError(() => api.createTraining({ name: ' ', trainingDate: '2026-02-30', category: 'ARMS' as never, weight: -1, note: 5 as never }), 400, [
      'name must not be blank',
      'trainingDate must be a date in YYYY-MM-DD format',
      'category must be one of WHOLE_BODY, LEGS, UPPER_BODY',
      'weight must be zero or positive',
      'note must be text',
    ]);
    expectApiError(() => api.createTraining(undefined as never), 400);
    expect(api.listTrainings()).toEqual([]);
  });

  it('copies exercises and sets with their notes and ratings into a new training', () => {
    const { api, training, exercise, sets } = withBenchSession();
    api.updateExercise(exercise.id, { position: 1, rating: 3, note: 'Use the wide grip' });
    api.updateSet(sets[0].id, { position: 1, repetitions: 10, weight: 55, rating: 2, note: 'Warm-up' });

    const copy = api.copyTraining(training.id, { name: 'Push again', trainingDate: '2026-03-14', category: 'UPPER_BODY', weight: 79.5 });
    expect(copy).toMatchObject({ name: 'Push again', trainingDate: '2026-03-14', weight: 79.5 });

    const copied = api.getTraining(copy.id).exercises;
    expect(copied).toHaveLength(1);
    expect(copied[0]).toMatchObject({ trainingId: copy.id, rating: 3, note: 'Use the wide grip' });
    expect(copied[0].id).not.toBe(exercise.id);
    expect(copied[0].sets.map(({ position, repetitions, weight, rating, note }) => ({ position, repetitions, weight, rating, note }))).toEqual([
      { position: 1, repetitions: 10, weight: 55, rating: 2, note: 'Warm-up' },
      { position: 2, repetitions: 10, weight: 60, rating: null, note: null },
      { position: 3, repetitions: 10, weight: 65, rating: null, note: null },
    ]);
    // The copy is independent: re-rating it leaves the source training's ratings as they were.
    api.updateExercise(copied[0].id, { position: 1, rating: 1 });
    api.updateSet(copied[0].sets[0].id, { position: 1, repetitions: 10, weight: 55, rating: 3 });
    const source = api.getTraining(training.id).exercises[0];
    expect(source.rating).toBe(3);
    expect(source.sets[0].rating).toBe(2);
    expect(api.listExerciseTypes().find((type) => type.id === benchPress)?.timesTrained).toBe(2);
    expectApiError(() => api.copyTraining('missing', { name: 'x', trainingDate: '2026-03-14', category: 'LEGS' }), 404);
  });
});

describe('exercises and sets', () => {
  it('validates exercise and set payloads', () => {
    const { api, training, exercise } = withBenchSession();
    expectApiError(() => api.addExercise(training.id, { exerciseTypeId: 'nope', position: 0, rating: 4 }), 400, [
      'exerciseTypeId must reference an existing exercise type',
      'position must be a positive whole number',
      'rating must be between 1 and 3',
    ]);
    expectApiError(() => api.addExercise('missing', { exerciseTypeId: benchPress, position: 1 }), 404);
    expectApiError(() => api.updateExercise('missing', { position: 1 }), 404);
    expectApiError(() => api.addSet(exercise.id, { position: 1.5, repetitions: 0, weight: Number.NaN }), 400, [
      'position must be a positive whole number',
      'repetitions must be a positive whole number',
      'weight must be zero or positive',
    ]);
    expectApiError(() => api.addSet('missing', { position: 1, repetitions: 1, weight: 0 }), 404);
    expectApiError(() => api.deleteSet('missing'), 404);
    expectApiError(() => api.deleteExercise('missing'), 404);
  });

  it('updates exercise notes and ratings, and clears them again', () => {
    const { api, exercise } = withBenchSession();
    expect(api.updateExercise(exercise.id, { position: 1, rating: 2, note: 'Felt good' })).toMatchObject({ rating: 2, note: 'Felt good' });
    expect(api.updateExercise(exercise.id, { position: 1 })).toMatchObject({ rating: null, note: null });
  });

  it('keeps positions contiguous after deleting sets and exercises', () => {
    const { api, training, exercise, sets } = withBenchSession();
    const second = api.addExercise(training.id, { exerciseTypeId: squat, position: 2 });

    api.deleteSet(sets[0].id);
    expect(api.getTraining(training.id).exercises[0].sets.map((set) => [set.id, set.position])).toEqual([
      [sets[1].id, 1],
      [sets[2].id, 2],
    ]);

    api.deleteExercise(exercise.id);
    const remaining = api.getTraining(training.id).exercises;
    expect(remaining.map((item) => [item.id, item.position])).toEqual([[second.id, 1]]);
    expect(api.listExerciseSetHistory(benchPress)).toEqual([]);
  });

  it('supports the two-step reorder the UI performs', () => {
    const { api, training, sets } = withBenchSession();
    const [a, b, c] = sets;
    // UI moves changed sets to temporary positions first, then writes the final order.
    api.updateSet(a.id, { position: 100000, repetitions: 10, weight: 55 });
    api.updateSet(c.id, { position: 100001, repetitions: 10, weight: 65 });
    [c, b, a].forEach((set, index) => api.updateSet(set.id, { position: index + 1, repetitions: set.repetitions, weight: set.weight }));
    expect(api.getTraining(training.id).exercises[0].sets.map((set) => set.id)).toEqual([c.id, b.id, a.id]);
  });

  it('counts how often each exercise type was trained', () => {
    const { api, training } = withBenchSession();
    api.addExercise(training.id, { exerciseTypeId: benchPress, position: 2 });
    const counts = Object.fromEntries(api.listExerciseTypes().map((type) => [type.code, type.timesTrained]));
    expect(counts.BENCH_PRESS).toBe(2);
    expect(counts.SQUAT).toBe(0);
    expect(api.listExerciseTypes()).toHaveLength(demoExerciseTypes.length);
  });
});

describe('set history', () => {
  it('lists sets for one exercise type across trainings, newest training first', () => {
    const { api, training, exercise } = withBenchSession();
    api.updateExercise(exercise.id, { position: 1, rating: 2, note: 'Solid' });
    const later = api.createTraining({ name: 'Push 2', trainingDate: '2026-03-12', category: 'UPPER_BODY' });
    const laterExercise = api.addExercise(later.id, { exerciseTypeId: benchPress, position: 1 });
    api.addSet(laterExercise.id, { position: 1, repetitions: 5, weight: 70 });
    const legs = api.createTraining({ name: 'Legs', trainingDate: '2026-03-13', category: 'LEGS' });
    api.addSet(api.addExercise(legs.id, { exerciseTypeId: squat, position: 1 }).id, { position: 1, repetitions: 5, weight: 100 });

    const history = api.listExerciseSetHistory(benchPress);
    expect(history.map((item) => [item.training.name, item.set.position, item.set.weight])).toEqual([
      ['Push 2', 1, 70],
      ['Push', 1, 55],
      ['Push', 2, 60],
      ['Push', 3, 65],
    ]);
    expect(history[1]).toMatchObject({ trainingExerciseId: exercise.id, exercisePosition: 1, exerciseRating: 2, exerciseNote: 'Solid' });
    expect(history[1].training.id).toBe(training.id);
    expectApiError(() => api.listExerciseSetHistory('unknown'), 404);
  });
});

describe('persistence', () => {
  it('seeds once, then restores changes from storage', () => {
    const storage = memoryStorage();
    const first = new DemoBackend({ storage, now: () => today });
    const seeded = first.listTrainings().length;
    const created = first.createTraining({ name: 'Saved', trainingDate: '2026-03-15', category: 'LEGS' });

    const second = new DemoBackend({ storage, now: () => today });
    expect(second.listTrainings()).toHaveLength(seeded + 1);
    expect(second.getTraining(created.id).training.name).toBe('Saved');
  });

  it('returns copies so callers cannot mutate stored data', () => {
    const { api, training } = withBenchSession();
    api.getTraining(training.id).exercises[0].sets[0].weight = 999;
    api.listTrainings()[0].name = 'Mutated';
    expect(api.getTraining(training.id).exercises[0].sets[0].weight).toBe(55);
    expect(api.listTrainings()[0].name).toBe('Push');
  });

  it.each([
    ['corrupt JSON', '{not json'],
    ['an older format', JSON.stringify({ version: 0, trainings: [] })],
  ])('reseeds when storage holds %s', (_label, stored) => {
    const storage = memoryStorage({ [DEFAULT_DEMO_STORAGE_KEY]: stored });
    const api = new DemoBackend({ storage, now: () => today });
    expect(api.listTrainings().length).toBeGreaterThan(0);
    expect(JSON.parse(storage.data[DEFAULT_DEMO_STORAGE_KEY]).version).toBe(1);
  });

  it('reloads changes made elsewhere', () => {
    const storage = memoryStorage();
    const api = new DemoBackend({ storage, now: () => today });
    const other = new DemoBackend({ storage, now: () => today });

    other.createTraining({ name: 'From another tab', trainingDate: '2026-03-15', category: 'LEGS' });
    api.reload();
    expect(api.listTrainings()[0].name).toBe('From another tab');
  });

  it('reseeds the sample workouts after the stored data is cleared', () => {
    // Pin the generator: the default one picks a new random seed for every data set.
    const pinnedSeed: DemoBackendOptions['seed'] = (context) => createDemoSeed({ ...context, random: createRandomService(1) });
    const summarize = (api: DemoBackend) => api.listTrainings().map(({ name, trainingDate, weight }) => ({ name, trainingDate, weight }));
    const storage = memoryStorage();

    const original = summarize(new DemoBackend({ storage, now: () => today, seed: pinnedSeed }));
    new DemoBackend({ storage, now: () => today, seed: pinnedSeed }).createTraining({ name: 'Throwaway', trainingDate: '2026-03-15', category: 'LEGS' });

    storage.removeItem(DEFAULT_DEMO_STORAGE_KEY);
    const fresh = new DemoBackend({ storage, now: () => today, seed: pinnedSeed });
    expect(summarize(fresh)).toEqual(original);
    expect(summarize(fresh).some((training) => training.name === 'Throwaway')).toBe(false);
    expect(storage.getItem(DEFAULT_DEMO_STORAGE_KEY)).not.toBeNull();
  });

  it('keeps working in memory when storage rejects writes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const storage = { ...memoryStorage(), setItem: () => { throw new Error('QuotaExceededError'); } };
    const api = backend({ storage });
    api.createTraining({ name: 'In memory', trainingDate: '2026-03-15', category: 'LEGS' });
    expect(api.listTrainings()).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
  });

  it('works without any storage', () => {
    const api = backend({ storage: null });
    api.createTraining({ name: 'Volatile', trainingDate: '2026-03-15', category: 'LEGS' });
    api.reload();
    expect(api.listTrainings()).toHaveLength(1);
  });
});

describe('createUuid', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('uses crypto.randomUUID when available', () => {
    expect(createUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('falls back to getRandomValues outside secure contexts', () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(0xff) });
    expect(createUuid()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  });
});
