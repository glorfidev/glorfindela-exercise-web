import { beforeEach, expect, it, vi } from 'vitest';
import { exerciseApi, setApiTransport, type ApiTransport } from '../api/client';
import { DemoBackend, type DemoState } from './backend';
import { demoExerciseTypeId } from './catalog';
import { createDemoTransport } from './transport';

const benchPress = demoExerciseTypeId('BENCH_PRESS');
let transport: ApiTransport;

beforeEach(() => {
  let id = 0;
  const backend = new DemoBackend({
    now: () => new Date('2026-03-15T10:00:00Z'),
    createId: () => `id-${++id}`,
    seed: (): DemoState => ({ version: 1, trainings: [], exercises: [], sets: [] }),
  });
  transport = createDemoTransport(backend);
  setApiTransport(transport);
});

it('serves a full workout session through the real API client without fetch', async () => {
  const training = await exerciseApi.createTraining({ name: 'Push', trainingDate: '2026-03-15', category: 'UPPER_BODY', weight: 80 });
  const exercise = await exerciseApi.addExercise(training.id, { exerciseTypeId: benchPress, position: 1 });
  const [first] = await Promise.all([1, 2].map((position) => exerciseApi.addSet(exercise.id, { position, repetitions: 10, weight: 60 })));
  await exerciseApi.updateSet(first.id, { position: 1, repetitions: 8, weight: 62.5, rating: 3 });
  await exerciseApi.updateExercise(exercise.id, { position: 1, rating: 2, note: 'Good' });

  const detail = await exerciseApi.getTraining(training.id);
  expect(detail.exercises[0]).toMatchObject({ rating: 2, note: 'Good', exerciseType: { code: 'BENCH_PRESS', timesTrained: 1 } });
  expect(detail.exercises[0].sets.map((set) => [set.repetitions, set.weight])).toEqual([[8, 62.5], [10, 60]]);
  expect(await exerciseApi.listTrainings()).toHaveLength(1);
  expect((await exerciseApi.listExerciseTypes()).length).toBeGreaterThan(100);
  expect(await exerciseApi.listExerciseSetHistory(benchPress)).toHaveLength(2);

  const copy = await exerciseApi.copyTraining(training.id, { name: 'Push 2', trainingDate: '2026-03-16', category: 'UPPER_BODY' });
  await expect(exerciseApi.deleteSet(first.id)).resolves.toBeUndefined();
  await expect(exerciseApi.deleteExercise(exercise.id)).resolves.toBeUndefined();
  await expect(exerciseApi.deleteTraining(training.id)).resolves.toBeUndefined();
  expect((await exerciseApi.listTrainings()).map((item) => item.id)).toEqual([copy.id]);
  expect(fetch).not.toHaveBeenCalled();
});

it('reports validation errors the same way the backend does', async () => {
  await expect(exerciseApi.createTraining({ name: '', trainingDate: 'soon', category: 'LEGS' })).rejects.toThrow(
    'Validation failed: name must not be blank: trainingDate must be a date in YYYY-MM-DD format'
  );
  await expect(exerciseApi.getTraining('missing')).rejects.toThrow('Training not found');
});

it('uses REST status codes', async () => {
  const created = await transport('/trainings', { method: 'POST', body: JSON.stringify({ name: 'A', trainingDate: '2026-03-15', category: 'LEGS' }) });
  expect(created.status).toBe(201);
  const { id } = await created.json();
  expect((await transport(`/trainings/${id}?include=all`, {})).status).toBe(200);
  expect((await transport(`/trainings/${id}`, { method: 'delete' })).status).toBe(204);
  expect((await transport(`/trainings/${id}`, { method: 'GET' })).status).toBe(404);
});

it.each([
  ['an unknown endpoint', '/nope', { method: 'GET' }, 404, 'No demo endpoint for GET /nope'],
  ['an unsupported method', '/trainings', { method: 'PATCH' }, 404, 'No demo endpoint for PATCH /trainings'],
  ['malformed JSON', '/trainings', { method: 'POST', body: '{' }, 400, 'Malformed JSON request body'],
  ['a non-JSON body', '/trainings', { method: 'POST', body: new Blob(['x']) }, 415, 'Demo backend only accepts JSON string bodies'],
] as const)('rejects %s', async (_label, path, init, status, message) => {
  const response = await transport(path, init as RequestInit);
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ message });
});

it('turns unexpected backend failures into a 500 response', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const backend = new DemoBackend({ seed: () => ({ version: 1, trainings: [], exercises: [], sets: [] }) });
  vi.spyOn(backend, 'listTrainings').mockImplementation(() => {
    throw new TypeError('boom');
  });
  const response = await createDemoTransport(backend)('/trainings', {});
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ message: 'Demo backend error' });
  expect(error).toHaveBeenCalled();
});

it('simulates network latency when configured', async () => {
  vi.useFakeTimers();
  try {
    const backend = new DemoBackend({ seed: () => ({ version: 1, trainings: [], exercises: [], sets: [] }) });
    const pending = createDemoTransport(backend, { latencyMs: 200 })('/trainings', {});
    let settled = false;
    void pending.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(199);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending).status).toBe(200);
  } finally {
    vi.useRealTimers();
  }
});
