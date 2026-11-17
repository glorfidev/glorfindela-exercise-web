# Local demo mode

```bash
npm run dev:demo
```

Starts the regular app with mock data, so you can develop and try every screen without Keycloak,
the backend, a database, or Docker. The UI looks exactly like the regular app, with no demo banner.
The terminal shows `demo` next to the Vite version, so you can tell which mode is running.

- **Mock login**: the app starts on its login screen. **Login** opens a sign-in page in place of Keycloak's,
  and **any** username and password are accepted. The user menu shows the name you entered. Like a Keycloak
  session, the sign-in survives page reloads (`sessionStorage`, key `glorfex-demo-session`) until you log
  out or close the tab. All users share the same demo data.
- **Generated sample data**: every sign-in generates a fresh, pseudo-random data set of about four weeks
  of workouts (upper body, legs, full body) with progressive weights, dated relative to today. Whatever
  the seed, the data always includes the edge cases the UI needs: a training without body weight, notes,
  ratings, and an exercise without sets. Logging out and back in is the quickest way to get new data.
- **Everything works** as with the real backend: create, copy, and delete trainings; add, rate, annotate,
  reorder, and delete exercises and sets; view exercise history; export all trainings as CSV.
- **Data persists** in `localStorage` (`glorfex-demo-state`) across reloads and stays in sync across tabs.
  To restore the sample workouts, delete that key and reload the page. In the browser console, run
  `localStorage.removeItem('glorfex-demo-state'); location.reload()`.

## How it works

Only the app's two outer boundaries are replaced. The pages and components are the same code as in production.

| Boundary | Production | Demo mode |
| --- | --- | --- |
| API | `fetch` to `VITE_EXERCISE_API_URL` | `createDemoTransport` → `DemoBackend` (in memory) |
| Session | `AuthProvider` (Keycloak) | `DemoAuthProvider` + `DemoLoginPage` (any credentials) |

`main.tsx` loads `src/demo` only when Vite runs with `--mode demo`. The check is static, so regular
builds (`npm run build`) contain no demo code.

The transport answers the same REST routes, status codes, and error payloads (`{ message, details }`)
as the backend, so the real `exerciseApi` client and its error handling run unchanged.

| File | Purpose |
| --- | --- |
| `backend.ts` | In-memory API: validation, 404s, cascading deletes, set history, persistence |
| `transport.ts` | Maps HTTP method and path to `DemoBackend`, returns real `Response`s |
| `catalog.ts` | Exercise types (one per thumbnail in `public/exercise-thumbnails`) |
| `random.ts` | Seeded pseudo-random service (`createRandomService`); same seed, same data |
| `seed.ts` | Generates the sample workouts from exercise pools with realistic weight ranges |

### Behaviour the demo backend assumes

These are reasonable guesses where the frontend doesn't pin down the backend's behaviour. Align them
if the real API behaves differently:

- Every sign-in starts from a freshly generated data set (a real backend would keep each user's data).
  Data still persists across page reloads while signed in.
- After deleting an exercise or set, the remaining positions are renumbered 1..n. The UI computes
  the next position as `count + 1`.
- Copying a training copies its exercises and sets, including their notes and ratings.
- Trainings are listed newest first. `timesTrained` counts how often an exercise type was added to a training.

When you add an endpoint to `src/api/client.ts`, add it to the route table in `transport.ts` too.
Otherwise the demo answers `404 No demo endpoint for …`.
