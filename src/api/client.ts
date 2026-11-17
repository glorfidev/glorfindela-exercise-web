import type {
  ApiError,
  CopyTrainingRequest,
  CreateExerciseSetRequest,
  CreateTrainingExerciseRequest,
  CreateTrainingRequest,
  ExerciseSet,
  ExerciseSetHistoryItem,
  ExerciseType,
  Training,
  TrainingDetail,
  TrainingExercise,
  UpdateExerciseSetRequest,
  UpdateTrainingExerciseRequest,
  UUID,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_EXERCISE_API_URL ?? '/api';

let accessTokenProvider: (() => Promise<string | undefined>) | undefined;

export function setAccessTokenProvider(provider: () => Promise<string | undefined>) {
  accessTokenProvider = provider;
}

/**
 * Sends an API request. `path` is relative to the API base URL, e.g. `/trainings`.
 * Defaults to `fetch` against the real backend; local demo mode swaps in an in-memory backend.
 */
export type ApiTransport = (path: string, init: RequestInit) => Promise<Response>;

const fetchTransport: ApiTransport = (path, init) => fetch(`${API_BASE_URL}${path}`, init);

let transport: ApiTransport = fetchTransport;

export function setApiTransport(next: ApiTransport) {
  transport = next;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await accessTokenProvider?.();

  const response = await transport(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const error = (await response.json()) as ApiError;
      message = [error.message, ...(error.details ?? [])].filter(Boolean).join(': ');
    } catch {
      // Keep the status-based fallback.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseText = await response.text();
  if (!responseText) {
    return undefined as T;
  }

  return JSON.parse(responseText) as T;
}

export const exerciseApi = {
  listTrainings: () => request<Training[]>('/trainings'),
  createTraining: (body: CreateTrainingRequest) =>
    request<Training>('/trainings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteTraining: (id: UUID) =>
    request<void>(`/trainings/${id}`, {
      method: 'DELETE',
    }),
  getTraining: (id: UUID) => request<TrainingDetail>(`/trainings/${id}`),
  copyTraining: (id: UUID, body: CopyTrainingRequest) =>
    request<Training>(`/trainings/${id}/copy`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listExerciseTypes: () => request<ExerciseType[]>('/exercise-types'),
  listExerciseSetHistory: (exerciseTypeId: UUID) =>
    request<ExerciseSetHistoryItem[]>(`/exercise-types/${exerciseTypeId}/sets`),
  addExercise: (trainingId: UUID, body: CreateTrainingExerciseRequest) =>
    request<TrainingDetail['exercises'][number]>(`/trainings/${trainingId}/exercises`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateExercise: (id: UUID, body: UpdateTrainingExerciseRequest) =>
    request<TrainingExercise>(`/training-exercises/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteExercise: (id: UUID) =>
    request<void>(`/training-exercises/${id}`, {
      method: 'DELETE',
    }),
  addSet: (trainingExerciseId: UUID, body: CreateExerciseSetRequest) =>
    request<ExerciseSet>(`/training-exercises/${trainingExerciseId}/sets`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateSet: (id: UUID, body: UpdateExerciseSetRequest) =>
    request<ExerciseSet>(`/exercise-sets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteSet: (id: UUID) =>
    request<void>(`/exercise-sets/${id}`, {
      method: 'DELETE',
    }),
};
