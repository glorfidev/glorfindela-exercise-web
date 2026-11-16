export type UUID = string;

export type TrainingCategory = 'WHOLE_BODY' | 'LEGS' | 'UPPER_BODY';

export type ExerciseType = {
  id: UUID;
  code: string;
  name: string;
  category?: string | null;
  timesTrained: number;
  createdAt: string;
  updatedAt: string;
};

export type Training = {
  id: UUID;
  name: string;
  note?: string | null;
  trainingDate: string;
  category: TrainingCategory;
  weight?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ExerciseSet = {
  id: UUID;
  trainingExerciseId: UUID;
  position: number;
  repetitions: number;
  weight: number;
  rating?: number | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TrainingExercise = {
  id: UUID;
  trainingId: UUID;
  exerciseType: ExerciseType;
  position: number;
  note?: string | null;
  rating?: number | null;
  sets: ExerciseSet[];
  createdAt: string;
  updatedAt: string;
};

export type TrainingDetail = {
  training: Training;
  exercises: TrainingExercise[];
};

export type ExerciseSetHistoryItem = {
  training: Training;
  trainingExerciseId: UUID;
  exercisePosition: number;
  exerciseRating?: number | null;
  exerciseNote?: string | null;
  set: ExerciseSet;
};

export type ApiError = {
  message: string;
  details?: string[];
};

export type CreateTrainingRequest = {
  name: string;
  trainingDate: string;
  category: TrainingCategory;
  weight?: number | null;
  note?: string | null;
};

export type CreateTrainingExerciseRequest = {
  exerciseTypeId: UUID;
  position: number;
  note?: string | null;
  rating?: number | null;
};

export type UpdateTrainingExerciseRequest = {
  position: number;
  note?: string | null;
  rating?: number | null;
};

export type CopyTrainingRequest = {
  name: string;
  trainingDate: string;
  category: TrainingCategory;
  weight?: number | null;
};

export type CreateExerciseSetRequest = {
  position: number;
  repetitions: number;
  weight: number;
  rating?: number | null;
  note?: string | null;
};

export type UpdateExerciseSetRequest = {
  position: number;
  repetitions: number;
  weight: number;
  rating?: number | null;
  note?: string | null;
};
