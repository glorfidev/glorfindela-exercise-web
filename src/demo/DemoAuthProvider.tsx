import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue, type AuthUser } from '../auth/AuthContext';
import type { StorageLike } from './backend';
import DemoLoginPage from './DemoLoginPage';

export const DEMO_SESSION_KEY = 'glorfex-demo-session';

/**
 * Mimics the Keycloak flow without Keycloak: the app starts signed out, "Login" opens a mock
 * sign-in page that accepts any credentials, and "Logout" returns to the app's login screen.
 * Like a Keycloak SSO session, the sign-in survives page reloads until logout or the tab is closed.
 */
type DemoAuthProviderProps = {
  children: ReactNode;
  storage?: StorageLike | null;
  /** Called on every successful sign-in, e.g. to generate a fresh demo data set. */
  onSignIn?: (username: string) => void;
};

export function DemoAuthProvider({ children, onSignIn, storage = browserSessionStorage() }: DemoAuthProviderProps) {
  const [user, setUser] = useState<AuthUser | undefined>(() => readSession(storage));
  const [signingIn, setSigningIn] = useState(false);

  const signIn = useCallback(
    (username: string) => {
      const signedIn = userFor(username);
      writeSession(storage, signedIn);
      setUser(signedIn);
      setSigningIn(false);
      onSignIn?.(username);
    },
    [onSignIn, storage]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      authenticated: user !== undefined,
      initializing: false,
      user,
      login: () => setSigningIn(true),
      logout: () => {
        writeSession(storage, undefined);
        setUser(undefined);
      },
      getToken: async () => (user ? 'demo-token' : undefined),
    }),
    [storage, user]
  );

  // Rendered instead of the app, like the redirect to the Keycloak sign-in page.
  if (signingIn) {
    return <DemoLoginPage onSignIn={signIn} onCancel={() => setSigningIn(false)} />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function userFor(username: string): AuthUser {
  return {
    subject: `demo-${username.toLowerCase()}`,
    username,
    email: username.includes('@') ? username : undefined,
  };
}

function readSession(storage: StorageLike | null): AuthUser | undefined {
  try {
    const username = storage?.getItem(DEMO_SESSION_KEY);
    return username ? userFor(username) : undefined;
  } catch {
    return undefined;
  }
}

function writeSession(storage: StorageLike | null, user: AuthUser | undefined) {
  try {
    if (user?.username) {
      storage?.setItem(DEMO_SESSION_KEY, user.username);
    } else {
      storage?.removeItem(DEMO_SESSION_KEY);
    }
  } catch {
    // Without sessionStorage the sign-in simply lasts until the next page reload.
  }
}

function browserSessionStorage(): StorageLike | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
