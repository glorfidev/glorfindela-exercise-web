import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8081',
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'exercise',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'exercise-app',
});

let initPromise: Promise<boolean> | null = null;

export function initKeycloak() {
  initPromise ??= keycloak.init({
    onLoad: 'check-sso',
    pkceMethod: 'S256',
    checkLoginIframe: false,
  });

  return initPromise;
}

export default keycloak;
