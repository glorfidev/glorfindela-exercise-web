import type { ExerciseSet, ExerciseSetHistoryItem, ExerciseType, Training, TrainingDetail, TrainingExercise } from '../types/api';

const timestamps = { createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' };

export function training(overrides: Partial<Training> = {}): Training {
  return { id: 'training-1', name: 'Morning workout', trainingDate: '2026-01-10', category: 'UPPER_BODY', weight: 75, ...timestamps, ...overrides };
}

export function exerciseType(overrides: Partial<ExerciseType> = {}): ExerciseType {
  return { id: 'type-1', code: 'BENCH_PRESS', name: 'Bench Press', category: 'Chest', timesTrained: 3, ...timestamps, ...overrides };
}

export function exerciseSet(overrides: Partial<ExerciseSet> = {}): ExerciseSet {
  return { id: 'set-1', trainingExerciseId: 'exercise-1', position: 1, repetitions: 10, weight: 50, rating: null, note: null, ...timestamps, ...overrides };
}

export function exercise(overrides: Partial<TrainingExercise> = {}): TrainingExercise {
  return { id: 'exercise-1', trainingId: 'training-1', exerciseType: exerciseType(), position: 1, rating: null, note: null, sets: [exerciseSet()], ...timestamps, ...overrides };
}

export function trainingDetail(overrides: Partial<TrainingDetail> = {}): TrainingDetail {
  return { training: training(), exercises: [exercise()], ...overrides };
}

export function historyItem(overrides: Partial<ExerciseSetHistoryItem> = {}): ExerciseSetHistoryItem {
  return { training: training(), trainingExerciseId: 'exercise-1', exercisePosition: 1, set: exerciseSet(), ...overrides };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
