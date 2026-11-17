import type { ComponentType, ReactNode } from 'react';
import { setApiTransport } from '../api/client';
import { DEFAULT_DEMO_STORAGE_KEY, DemoBackend, type DemoBackendOptions, type StorageLike } from './backend';
import { DemoAuthProvider } from './DemoAuthProvider';
import { createDemoTransport } from './transport';

export type DemoModeOptions = {
  storage?: StorageLike | null;
  latencyMs?: number;
  /** Builds a demo data set; defaults to pseudo-randomly generated workouts. Mainly for tests. */
  seed?: DemoBackendOptions['seed'];
};

export type DemoMode = {
  backend: DemoBackend;
  SessionProvider: ComponentType<{ children: ReactNode }>;
};

/**
 * Switches the app to local demo mode (`npm run dev:demo`): API calls are answered by an
 * in-memory backend persisted to localStorage, and a demo user is signed in without Keycloak.
 */
export function startDemoMode({ storage = browserStorage(), latencyMs = 150, seed }: DemoModeOptions = {}): DemoMode {
  const backend = new DemoBackend({ storage, storageKey: DEFAULT_DEMO_STORAGE_KEY, seed });
  setApiTransport(createDemoTransport(backend, { latencyMs }));

  // Keep several open tabs consistent: pick up changes another tab persisted.
  window.addEventListener('storage', (event) => {
    if (event.key === DEFAULT_DEMO_STORAGE_KEY) backend.reload();
  });

  // Like a fresh account, every sign-in starts from a newly generated data set.
  const SessionProvider = ({ children }: { children: ReactNode }) => (
    <DemoAuthProvider onSignIn={() => backend.reseed()}>{children}</DemoAuthProvider>
  );

  return { backend, SessionProvider };
}

function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    // Access to localStorage can throw when storage is disabled; fall back to in-memory data.
    return null;
  }
}
