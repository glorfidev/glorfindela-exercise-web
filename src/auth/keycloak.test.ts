import { expect, it, vi } from 'vitest';

const { init, constructor } = vi.hoisted(() => {
  const init = vi.fn().mockResolvedValue(true);
  const constructor = vi.fn(function () { return { init }; });
  return { init, constructor };
});
vi.mock('keycloak-js', () => ({ default: constructor }));

it('initializes Keycloak once, including concurrent callers', async () => {
  vi.resetModules();
  const { initKeycloak } = await import('./keycloak');
  const first = initKeycloak();
  const second = initKeycloak();
  expect(first).toBe(second);
  await expect(first).resolves.toBe(true);
  expect(init).toHaveBeenCalledOnce();
  expect(init).toHaveBeenCalledWith({ onLoad: 'check-sso', pkceMethod: 'S256', checkLoginIframe: false });
  expect(constructor).toHaveBeenCalledWith({ url: 'http://localhost:8081', realm: 'exercise', clientId: 'exercise-app' });
});

it('honors configured Keycloak connection settings', async () => {
  vi.stubEnv('VITE_KEYCLOAK_URL', 'https://auth.example.test');
  vi.stubEnv('VITE_KEYCLOAK_REALM', 'test-realm');
  vi.stubEnv('VITE_KEYCLOAK_CLIENT_ID', 'test-client');
  vi.resetModules();
  await import('./keycloak');
  expect(constructor).toHaveBeenCalledWith({ url: 'https://auth.example.test', realm: 'test-realm', clientId: 'test-client' });
});
