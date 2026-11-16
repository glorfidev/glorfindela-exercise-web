import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exerciseApi, setAccessTokenProvider } from './client';

const trainingRequest = { name: 'Leg day', trainingDate: '2026-01-10', category: 'LEGS' as const };
const exerciseRequest = { exerciseTypeId: 'type-1', position: 2 };
const setRequest = { position: 1, repetitions: 10, weight: 50 };

beforeEach(() => setAccessTokenProvider(async () => undefined));

describe('API routes and payloads', () => {
  it.each([
    ['list trainings', () => exerciseApi.listTrainings(), '/trainings', 'GET', undefined],
    ['create training', () => exerciseApi.createTraining(trainingRequest), '/trainings', 'POST', trainingRequest],
    ['get training', () => exerciseApi.getTraining('t1'), '/trainings/t1', 'GET', undefined],
    ['copy training', () => exerciseApi.copyTraining('t1', trainingRequest), '/trainings/t1/copy', 'POST', trainingRequest],
    ['delete training', () => exerciseApi.deleteTraining('t1'), '/trainings/t1', 'DELETE', undefined],
    ['list types', () => exerciseApi.listExerciseTypes(), '/exercise-types', 'GET', undefined],
    ['history', () => exerciseApi.listExerciseSetHistory('type-1'), '/exercise-types/type-1/sets', 'GET', undefined],
    ['add exercise', () => exerciseApi.addExercise('t1', exerciseRequest), '/trainings/t1/exercises', 'POST', exerciseRequest],
    ['update exercise', () => exerciseApi.updateExercise('e1', { position: 2 }), '/training-exercises/e1', 'PUT', { position: 2 }],
    ['delete exercise', () => exerciseApi.deleteExercise('e1'), '/training-exercises/e1', 'DELETE', undefined],
    ['add set', () => exerciseApi.addSet('e1', setRequest), '/training-exercises/e1/sets', 'POST', setRequest],
    ['update set', () => exerciseApi.updateSet('s1', setRequest), '/exercise-sets/s1', 'PUT', setRequest],
    ['delete set', () => exerciseApi.deleteSet('s1'), '/exercise-sets/s1', 'DELETE', undefined],
  ] as const)('%s', async (_name, call, path, method, body) => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ id: 'response-1' })));
    await expect(call()).resolves.toEqual({ id: 'response-1' });
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(`/api${path}`);
    expect(options?.method ?? 'GET').toBe(method);
    expect(options?.body).toBe(body ? JSON.stringify(body) : undefined);
    expect(options?.headers).toEqual({ 'content-type': 'application/json' });
  });
});

it('obtains a fresh access token for each request', async () => {
  const provider = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('refreshed');
  setAccessTokenProvider(provider);
  vi.mocked(fetch).mockImplementation(async () => new Response('[]'));
  await exerciseApi.listTrainings();
  await exerciseApi.listTrainings();
  expect(provider).toHaveBeenCalledTimes(2);
  expect(vi.mocked(fetch).mock.calls.map(([, options]) => options?.headers)).toEqual([
    { 'content-type': 'application/json', authorization: 'Bearer first' },
    { 'content-type': 'application/json', authorization: 'Bearer refreshed' },
  ]);
});

it.each([204, 200])('accepts an empty successful response (%i)', async (status) => {
  vi.mocked(fetch).mockResolvedValue(new Response(null, { status }));
  await expect(exerciseApi.deleteSet('s1')).resolves.toBeUndefined();
});

it('includes server validation details in errors', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ message: 'Invalid set', details: ['Weight must be positive', 'Repetitions required'] }), { status: 400 }));
  await expect(exerciseApi.addSet('e1', setRequest)).rejects.toThrow('Invalid set: Weight must be positive: Repetitions required');
});

it('reports HTTP status when the error response is not JSON', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('<html>Unavailable</html>', { status: 503 }));
  await expect(exerciseApi.listTrainings()).rejects.toThrow('Request failed with status 503');
});

it('propagates network and token failures', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('Offline'));
  await expect(exerciseApi.listTrainings()).rejects.toThrow('Offline');
  vi.mocked(fetch).mockClear();
  setAccessTokenProvider(async () => { throw new Error('Session expired'); });
  await expect(exerciseApi.listTrainings()).rejects.toThrow('Session expired');
  expect(fetch).not.toHaveBeenCalled();
});

it('uses a configured API base URL', async () => {
  vi.stubEnv('VITE_EXERCISE_API_URL', 'https://api.example.test');
  vi.resetModules();
  const { exerciseApi: configuredApi } = await import('./client');
  vi.mocked(fetch).mockResolvedValue(new Response('[]'));
  await configuredApi.listTrainings();
  expect(fetch).toHaveBeenCalledWith('https://api.example.test/trainings', expect.any(Object));
});
