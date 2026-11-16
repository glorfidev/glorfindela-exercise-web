import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { setAccessTokenProvider } from '../api/client';
import { deferred } from '../test/fixtures';
import { AuthProvider, useAuth } from './AuthContext';
import keycloak, { initKeycloak } from './keycloak';

vi.mock('../api/client', () => ({ setAccessTokenProvider: vi.fn() }));
vi.mock('./keycloak', () => ({
  initKeycloak: vi.fn(),
  default: { authenticated: false, token: undefined, tokenParsed: undefined, updateToken: vi.fn(), login: vi.fn(), logout: vi.fn() },
}));

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
  vi.resetAllMocks();
  keycloak.authenticated = false;
  keycloak.token = undefined;
  keycloak.tokenParsed = undefined;
  vi.mocked(initKeycloak).mockResolvedValue(false);
  vi.mocked(keycloak.updateToken).mockResolvedValue(false);
});

it('initializes a signed-out session and registers the API token provider', async () => {
  const { result } = renderHook(useAuth, { wrapper });
  expect(result.current.initializing).toBe(true);
  await waitFor(() => expect(result.current.initializing).toBe(false));
  expect(result.current.authenticated).toBe(false);
  expect(result.current.user).toBeUndefined();
  expect(setAccessTokenProvider).toHaveBeenCalledWith(result.current.getToken);
  await expect(result.current.getToken()).resolves.toBeUndefined();
  expect(keycloak.updateToken).not.toHaveBeenCalled();
});

it('exposes the authenticated user and refreshes tokens before API requests', async () => {
  vi.mocked(initKeycloak).mockResolvedValue(true);
  keycloak.authenticated = true;
  keycloak.token = 'access-token';
  keycloak.tokenParsed = { sub: 'user-1', email: 'user@example.test', name: 'Test User', preferred_username: 'tester' };
  const { result } = renderHook(useAuth, { wrapper });
  await waitFor(() => expect(result.current.authenticated).toBe(true));
  expect(result.current.user).toEqual({ subject: 'user-1', email: 'user@example.test', displayName: 'Test User', username: 'tester' });
  await expect(result.current.getToken()).resolves.toBe('access-token');
  expect(keycloak.updateToken).toHaveBeenCalledWith(30);
});

it.each([new Error('SSO unavailable'), 'unknown'])('reports authentication initialization failures', async (failure) => {
  vi.mocked(initKeycloak).mockRejectedValue(failure);
  const { result } = renderHook(useAuth, { wrapper });
  await waitFor(() => expect(result.current.initializing).toBe(false));
  expect(result.current.error).toBe(failure instanceof Error ? 'SSO unavailable' : 'Authentication failed');
});

it('uses the current location for login and origin for logout', async () => {
  const { result } = renderHook(useAuth, { wrapper });
  await waitFor(() => expect(result.current.initializing).toBe(false));
  result.current.login();
  result.current.logout();
  expect(keycloak.login).toHaveBeenCalledWith({ redirectUri: window.location.href });
  expect(keycloak.logout).toHaveBeenCalledWith({ redirectUri: window.location.origin });
});

it('reacts to login, logout and token expiration callbacks', async () => {
  const { result } = renderHook(useAuth, { wrapper });
  await waitFor(() => expect(result.current.initializing).toBe(false));
  keycloak.tokenParsed = { sub: 'user-2', name: 123 };
  act(() => keycloak.onAuthSuccess?.());
  expect(result.current.authenticated).toBe(true);
  expect(result.current.user).toMatchObject({ subject: 'user-2', displayName: undefined });
  act(() => keycloak.onAuthLogout?.());
  expect(result.current.authenticated).toBe(false);
  expect(result.current.user).toBeUndefined();
  act(() => keycloak.onTokenExpired?.());
  expect(keycloak.updateToken).toHaveBeenCalledWith(30);
});

it('does not update the provider after it unmounts during initialization', async () => {
  const pending = deferred<boolean>();
  vi.mocked(initKeycloak).mockReturnValue(pending.promise);
  const { unmount } = renderHook(useAuth, { wrapper });
  unmount();
  await act(async () => pending.resolve(true));
  expect(initKeycloak).toHaveBeenCalledOnce();
});

it('requires the authentication provider', () => {
  expect(() => renderHook(useAuth)).toThrow('useAuth must be used inside AuthProvider');
});
