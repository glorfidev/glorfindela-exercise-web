import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setAccessTokenProvider } from '../api/client';
import keycloak, { initKeycloak } from './keycloak';

type AuthUser = {
  subject: string;
  email?: string;
  displayName?: string;
  username?: string;
};

type AuthContextValue = {
  authenticated: boolean;
  initializing: boolean;
  error?: string;
  user?: AuthUser;
  login: () => void;
  logout: () => void;
  getToken: () => Promise<string | undefined>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readUser(): AuthUser | undefined {
  const token = keycloak.tokenParsed;
  if (!token?.sub) return undefined;

  return {
    subject: token.sub,
    email: typeof token.email === 'string' ? token.email : undefined,
    displayName: typeof token.name === 'string' ? token.name : undefined,
    username: typeof token.preferred_username === 'string' ? token.preferred_username : undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string>();
  const [user, setUser] = useState<AuthUser>();

  const getToken = useCallback(async () => {
    if (!keycloak.authenticated) return undefined;

    await keycloak.updateToken(30);
    return keycloak.token;
  }, []);

  useEffect(() => {
    let mounted = true;

    setAccessTokenProvider(getToken);

    initKeycloak()
      .then((isAuthenticated) => {
        if (!mounted) return;
        setAuthenticated(isAuthenticated);
        setUser(isAuthenticated ? readUser() : undefined);
      })
      .catch((cause) => {
        if (!mounted) return;
        const message = cause instanceof Error ? cause.message : 'Authentication failed';
        setError(message);
      })
      .finally(() => {
        if (mounted) setInitializing(false);
      });

    keycloak.onAuthSuccess = () => {
      setAuthenticated(true);
      setUser(readUser());
    };
    keycloak.onAuthLogout = () => {
      setAuthenticated(false);
      setUser(undefined);
    };
    keycloak.onTokenExpired = () => {
      void keycloak.updateToken(30);
    };

    return () => {
      mounted = false;
    };
  }, [getToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authenticated,
      initializing,
      error,
      user,
      login: () => {
        void keycloak.login({ redirectUri: window.location.href });
      },
      logout: () => {
        void keycloak.logout({ redirectUri: window.location.origin });
      },
      getToken,
    }),
    [authenticated, error, getToken, initializing, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
