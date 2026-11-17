import type { ExerciseSet, Training, TrainingCategory } from '../types/api';
import type { DemoExerciseRecord, DemoState } from './backend';
import { demoExerciseTypeId } from './catalog';
import { createRandomService, type RandomService } from './random';

export type SeedContext = {
  today: Date;
  createId: () => string;
  /** Pin a seeded service (`createRandomService(seed)`) for reproducible data, e.g. in tests. */
  random?: RandomService;
};

/** An exercise the generator can put into a session, with a realistic loading range in kg. */
type PoolExercise = { code: string; min: number; max: number; step: number };

const exercise = (code: string, min: number, max: number, step = 2.5): PoolExercise => ({ code, min, max, step });
const bodyweight = (code: string): PoolExercise => exercise(code, 0, 0, 0);

const pools: Record<TrainingCategory, PoolExercise[]> = {
  UPPER_BODY: [
    exercise('BENCH_PRESS', 40, 100),
    exercise('INCLINE_BENCH_PRESS', 35, 80),
    exercise('STRICT_PRESS', 30, 60),
    exercise('BARBELL_ROW', 40, 85),
    exercise('DUMBBELL_BENCH_PRESS', 16, 36, 2),
    exercise('DUMBBELL_SHOULDER_PRESS', 12, 28, 2),
    exercise('LAT_PULLDOWN', 40, 75, 5),
    exercise('CABLE_ROW', 40, 80, 5),
    exercise('LATERAL_RAISE', 6, 14, 2),
    exercise('EZ_BAR_CURL', 20, 40),
    exercise('TRICEPS_PUSHDOWN', 20, 45, 5),
    exercise('FACE_PULL', 15, 35, 5),
    bodyweight('PULL_UP'),
    bodyweight('PUSH_UP'),
  ],
  LEGS: [
    exercise('SQUAT', 60, 140),
    exercise('FRONT_SQUAT', 40, 90),
    exercise('ROMANIAN_DEADLIFT', 50, 110),
    exercise('LEG_PRESS', 100, 220, 10),
    exercise('HIP_THRUST', 60, 140),
    exercise('LEG_CURL', 30, 60, 5),
    exercise('LEG_EXTENSION', 30, 70, 5),
    exercise('BULGARIAN_SPLIT_SQUAT', 10, 26, 2),
    exercise('GOBLET_SQUAT', 12, 28, 2),
    exercise('WALKING_LUNGE', 10, 24, 2),
    exercise('STANDING_CALF_RAISE', 30, 60, 5),
  ],
  WHOLE_BODY: [
    exercise('DEADLIFT', 80, 180),
    exercise('POWER_CLEAN', 40, 80),
    exercise('THRUSTER', 30, 55),
    exercise('KETTLEBELL_SWING', 16, 32, 4),
    exercise('DUMBBELL_BENCH_PRESS', 16, 36, 2),
    exercise('FARMERS_CARRY', 20, 32, 2),
    bodyweight('PULL_UP'),
    bodyweight('HANGING_LEG_RAISE'),
    bodyweight('BURPEE'),
  ],
};

const sessionNames: Record<TrainingCategory, string[]> = {
  UPPER_BODY: ['Upper body', 'Push & pull', 'Push day', 'Chest & back', 'Arms & shoulders'],
  LEGS: ['Leg day', 'Lower body', 'Squat day', 'Legs & glutes'],
  WHOLE_BODY: ['Full body', 'Whole body', 'Strength circuit', 'Conditioning'],
};

const trainingNotes = ['Felt strong today', 'Short on time', 'Slept badly, kept it light', 'Gym was packed', 'Good pump, solid session'];
const exerciseNotes = ['Slow negatives', 'Pause at the bottom', 'Focus on form', 'Wider grip than usual', 'Seat position 4'];
const setNotes = ['Last rep was a grind', 'Felt easy', 'Belt on', 'Spotter helped', 'Slight form breakdown'];

/** How one exercise is trained over the whole period, so its weight can progress week over week. */
type PlannedExercise = {
  pool: PoolExercise;
  baseWeight: number;
  weeklyIncrement: number;
  setCount: number;
  repetitions: number;
};

function planCategory(pool: PoolExercise[], random: RandomService): PlannedExercise[] {
  // The first pick is the anchor lift: always loaded and always progressing, so history shows a trend.
  const anchor = random.pick(pool.filter((item) => item.step > 0));
  const others = random.sample(pool.filter((item) => item !== anchor), random.int(3, 4));

  return [anchor, ...others].map((poolExercise, index) => {
    const { min, max, step } = poolExercise;
    const loaded = step > 0;
    return {
      pool: poolExercise,
      baseWeight: loaded ? random.step(min, min + (max - min) * 0.6, step) : 0,
      weeklyIncrement: loaded && (index === 0 || random.chance(0.5)) ? step * random.int(1, 2) : 0,
      setCount: random.int(3, 4),
      repetitions: loaded ? random.pick([5, 6, 8, 10, 12]) : random.int(8, 15),
    };
  });
}

function localIsoDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Generates roughly four weeks of pseudo-random sample workouts, dated relative to `today`.
 * Invariants the UI relies on are guaranteed regardless of the seed: at least one training note,
 * one training without a body weight, rated and annotated sets, and one exercise without sets.
 */
export function createDemoSeed({ today, createId, random = createRandomService() }: SeedContext): DemoState {
  const state: DemoState = { version: 1, trainings: [], exercises: [], sets: [] };

  const plans: Record<TrainingCategory, PlannedExercise[]> = {
    UPPER_BODY: planCategory(pools.UPPER_BODY, random),
    LEGS: planCategory(pools.LEGS, random),
    WHOLE_BODY: planCategory(pools.WHOLE_BODY, random),
  };

  // Train every 2-3 days, rotating the categories, from about four weeks ago until yesterday-ish.
  const rotation: TrainingCategory[] = ['UPPER_BODY', 'LEGS', 'WHOLE_BODY'];
  const firstDayAgo = random.int(24, 27);
  const sessions: Array<{ daysAgo: number; category: TrainingCategory }> = [];
  for (let daysAgo = firstDayAgo; daysAgo >= 1; daysAgo -= random.int(2, 3)) {
    sessions.push({ daysAgo, category: rotation[sessions.length % rotation.length] });
  }

  const baseBodyWeight = random.int(600, 950) / 10;
  const bodyWeightTrend = random.int(-15, 5) / 10 / sessions.length;
  const skippedWeighInIndex = random.int(0, sessions.length - 1);

  sessions.forEach(({ daysAgo, category }, sessionIndex) => {
    const week = Math.floor((firstDayAgo - daysAgo) / 7);
    const startedAt = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo, 18, 0);
    const timestamp = (minutes: number) => new Date(startedAt.getTime() + minutes * 60_000).toISOString();
    const bodyWeight = Math.round((baseBodyWeight + bodyWeightTrend * sessionIndex + random.int(-3, 3) / 10) * 10) / 10;
    const mostRecent = sessionIndex === sessions.length - 1;

    const training: Training = {
      id: createId(),
      name: random.pick(sessionNames[category]),
      note: random.chance(0.25) ? random.pick(trainingNotes) : null,
      trainingDate: localIsoDate(startedAt),
      category,
      weight: sessionIndex === skippedWeighInIndex ? null : bodyWeight,
      createdAt: timestamp(0),
      updatedAt: timestamp(75),
    };
    state.trainings.push(training);

    plans[category].forEach((planned, exerciseIndex) => {
      const record: DemoExerciseRecord = {
        id: createId(),
        trainingId: training.id,
        exerciseTypeId: demoExerciseTypeId(planned.pool.code),
        position: exerciseIndex + 1,
        note: random.chance(0.15) ? random.pick(exerciseNotes) : null,
        rating: random.chance(0.4) ? random.int(1, 3) : null,
        createdAt: timestamp(exerciseIndex * 15),
        updatedAt: timestamp(exerciseIndex * 15 + 14),
      };
      state.exercises.push(record);

      const loaded = planned.pool.step > 0;
      const weight = loaded ? Math.min(planned.baseWeight + planned.weeklyIncrement * week, planned.pool.max) : 0;
      const repetitions = loaded ? planned.repetitions : planned.repetitions + week;

      for (let setIndex = 0; setIndex < planned.setCount; setIndex++) {
        const lastSet = setIndex === planned.setCount - 1;
        const set: ExerciseSet = {
          id: createId(),
          trainingExerciseId: record.id,
          position: setIndex + 1,
          repetitions: Math.max(1, lastSet && random.chance(0.3) ? repetitions - random.int(1, 2) : repetitions),
          weight,
          rating: random.chance(0.2) ? random.int(1, 3) : null,
          note: random.chance(0.08) ? random.pick(setNotes) : null,
          createdAt: timestamp(exerciseIndex * 15 + setIndex * 3 + 1),
          updatedAt: timestamp(exerciseIndex * 15 + setIndex * 3 + 1),
        };
        state.sets.push(set);
      }
    });

    // The newest session also has a planned exercise with no sets recorded yet.
    if (mostRecent) {
      const planned = new Set(plans[category].map((item) => item.pool.code));
      const extra = random.pick(pools[category].filter((item) => !planned.has(item.code)));
      state.exercises.push({
        id: createId(),
        trainingId: training.id,
        exerciseTypeId: demoExerciseTypeId(extra.code),
        position: plans[category].length + 1,
        note: null,
        rating: null,
        createdAt: timestamp(plans[category].length * 15),
        updatedAt: timestamp(plans[category].length * 15),
      });
    }
  });

  ensureOptionalStates(state, random);
  return state;
}

/** Random chances usually produce these; force them so every seed renders all UI states. */
function ensureOptionalStates(state: DemoState, random: RandomService) {
  if (!state.trainings.some((training) => training.note)) {
    random.pick(state.trainings).note = random.pick(trainingNotes);
  }
  if (!state.exercises.some((exercise) => exercise.note)) {
    random.pick(state.exercises).note = random.pick(exerciseNotes);
  }
  if (!state.exercises.some((exercise) => exercise.rating)) {
    random.pick(state.exercises).rating = random.int(1, 3);
  }
  if (!state.sets.some((set) => set.note)) {
    random.pick(state.sets).note = random.pick(setNotes);
  }
  if (!state.sets.some((set) => set.rating)) {
    random.pick(state.sets).rating = random.int(1, 3);
  }
}
