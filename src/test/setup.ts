import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

beforeEach(() => {
  // An unmocked request must fail locally, never contact a backend or Keycloak.
  vi.stubGlobal('fetch', vi.fn(() => {
    throw new Error('Unexpected fetch: mock the API response in this test');
  }));
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
  vi.stubGlobal('scrollTo', vi.fn());
});

afterEach(cleanup);
