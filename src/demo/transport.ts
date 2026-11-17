import type { ApiTransport } from '../api/client';
import type { ApiError } from '../types/api';
import { DemoApiError, type DemoBackend } from './backend';

type Handler = (backend: DemoBackend, params: string[], body: any) => unknown;
type Route = { method: string; pattern: RegExp; status?: number; handle: Handler };

/** The exercise REST API, served from the in-memory demo backend. Keep in sync with `exerciseApi`. */
const routes: Route[] = [
  { method: 'GET', pattern: /^\/trainings$/, handle: (api) => api.listTrainings() },
  { method: 'POST', pattern: /^\/trainings$/, status: 201, handle: (api, _, body) => api.createTraining(body) },
  { method: 'GET', pattern: /^\/trainings\/([^/]+)$/, handle: (api, [id]) => api.getTraining(id) },
  { method: 'DELETE', pattern: /^\/trainings\/([^/]+)$/, handle: (api, [id]) => api.deleteTraining(id) },
  { method: 'POST', pattern: /^\/trainings\/([^/]+)\/copy$/, status: 201, handle: (api, [id], body) => api.copyTraining(id, body) },
  { method: 'POST', pattern: /^\/trainings\/([^/]+)\/exercises$/, status: 201, handle: (api, [id], body) => api.addExercise(id, body) },
  { method: 'GET', pattern: /^\/exercise-types$/, handle: (api) => api.listExerciseTypes() },
  { method: 'GET', pattern: /^\/exercise-types\/([^/]+)\/sets$/, handle: (api, [id]) => api.listExerciseSetHistory(id) },
  { method: 'PUT', pattern: /^\/training-exercises\/([^/]+)$/, handle: (api, [id], body) => api.updateExercise(id, body) },
  { method: 'DELETE', pattern: /^\/training-exercises\/([^/]+)$/, handle: (api, [id]) => api.deleteExercise(id) },
  { method: 'POST', pattern: /^\/training-exercises\/([^/]+)\/sets$/, status: 201, handle: (api, [id], body) => api.addSet(id, body) },
  { method: 'PUT', pattern: /^\/exercise-sets\/([^/]+)$/, handle: (api, [id], body) => api.updateSet(id, body) },
  { method: 'DELETE', pattern: /^\/exercise-sets\/([^/]+)$/, handle: (api, [id]) => api.deleteSet(id) },
];

export type DemoTransportOptions = {
  /** Artificial response delay so loading states are visible, like with a real network. */
  latencyMs?: number;
};

export function createDemoTransport(backend: DemoBackend, { latencyMs = 0 }: DemoTransportOptions = {}): ApiTransport {
  return async (path, init) => {
    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }
    return handleRequest(backend, (init.method ?? 'GET').toUpperCase(), path.split('?')[0], init.body);
  };
}

function handleRequest(backend: DemoBackend, method: string, path: string, rawBody: RequestInit['body']): Response {
  for (const route of routes) {
    const match = route.method === method ? route.pattern.exec(path) : null;
    if (!match) continue;

    try {
      const params = match.slice(1).map(decodeURIComponent);
      const result = route.handle(backend, params, parseBody(rawBody));
      return result === undefined ? new Response(null, { status: 204 }) : json(route.status ?? 200, result);
    } catch (error) {
      if (error instanceof DemoApiError) {
        const payload: ApiError = { message: error.message, ...(error.details.length > 0 ? { details: error.details } : {}) };
        return json(error.status, payload);
      }
      console.error('Demo backend failed', error);
      return json(500, { message: 'Demo backend error' });
    }
  }

  return json(404, { message: `No demo endpoint for ${method} ${path}` });
}

function parseBody(rawBody: RequestInit['body']): unknown {
  if (rawBody === undefined || rawBody === null || rawBody === '') return undefined;
  if (typeof rawBody !== 'string') {
    throw new DemoApiError(415, 'Demo backend only accepts JSON string bodies');
  }
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new DemoApiError(400, 'Malformed JSON request body');
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
