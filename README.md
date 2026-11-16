# Glorfindela Exercise Web

React frontend for the Glorfindela Exercise tracker.

## Tests

From `apps/exercise-web`, after installing dependencies:

```sh
npm test
npm run test:coverage
```

`npm test` runs once and exits. Use `npm run test:watch` during development.
The suite uses Vitest, React Testing Library, and jsdom. No backend, database,
Keycloak server, or Vite development server is needed. API calls and the Keycloak
adapter are mocked; unexpected `fetch` calls fail locally. Test connection settings
are fixed in `vitest.config.ts`, independent of local `.env` configuration.

Coverage includes:

- API routes, request bodies, access tokens, empty responses, and failures.
- Training creation, copying, deletion confirmation, navigation, and error recovery.
- Exercise selection and search, notes, ratings, grouped sets, and set reordering.
- Exercise history, loading, empty states, and failed requests.
- Authentication initialization, session callbacks, login/logout, and token refresh.
- CSV escaping, empty workouts, file downloads, and exporting all workouts.
- Asynchronous loading/reloading, numeric input controls, and modal interactions.

Tests live beside the source as `*.test.ts` / `*.test.tsx`. Shared factories in
`src/test/fixtures.ts` return fresh data for each test. Prefer assertions about
visible behavior and submitted data over snapshots or CSS classes.

`npm run test:coverage` writes an HTML report to `coverage/index.html` and LCOV data
to `coverage/lcov.info`. Minimum global coverage is 90% for statements and lines,
80% for branches, and 85% for functions. Reports include application TypeScript and
TSX, excluding declarations, test helpers/tests, and the `main.tsx` mounting entry
point. These tests do not verify real backend/SSO integration or browser layout.

Pull requests run the coverage suite in `exercise-web-tests.yml`; the deployment
workflow also runs it before building and deploying.

## Run

From `apps/exercise-web`:

```sh
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## API

In development, Vite proxies `/api` to:

```text
http://localhost:8080
```

To call another API base URL:

```sh
VITE_EXERCISE_API_URL=https://exercise-api.glorfindela.dev npm run dev
```

## Build

```sh
npm run build
```
