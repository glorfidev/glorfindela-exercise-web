import { configure, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../App';
import { downloadCsv } from '../utils/trainingCsv';
import { DEFAULT_DEMO_STORAGE_KEY, type DemoState } from './backend';
import { demoExerciseTypeId } from './catalog';
import { DEMO_SESSION_KEY, DemoAuthProvider } from './DemoAuthProvider';
import { startDemoMode, type DemoModeOptions } from './index';

vi.mock('../utils/trainingCsv', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/trainingCsv')>()),
  downloadCsv: vi.fn(),
}));

// These tests click through the full application in jsdom. Under a parallel (coverage) run a single
// navigation can exceed Testing Library's 1s default wait and a whole flow the 5s test default.
const UI_FLOW_TIMEOUT = 30_000;
configure({ asyncUtilTimeout: 5_000 });

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

/** Renders the real application in demo mode, exactly as `npm run dev:demo` wires it in main.tsx. */
function renderDemoApp(options: DemoModeOptions = {}) {
  const demo = startDemoMode({ storage: null, latencyMs: 0, ...options });
  const view = render(
    <demo.SessionProvider>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </demo.SessionProvider>
  );
  return { backend: demo.backend, unmount: view.unmount };
}

/** Goes through the mock sign-in page the way a user would. Any credentials are accepted. */
async function signIn(username = 'alex', password = 'anything') {
  await userEvent.click(await screen.findByRole('button', { name: 'Login' }));
  await userEvent.type(screen.getByLabelText('Username or email'), username);
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
}

/**
 * Small handcrafted data set so flow tests can assert on stable names and numbers.
 * Real runs use the pseudo-random generator instead, which is tested in backend.test.ts.
 */
function fixtureState(prefix = 'Seeded'): DemoState {
  let id = 0;
  const nextId = () => `${prefix}-${++id}`;
  const stamps = (time: string) => ({ createdAt: time, updatedAt: time });
  const pushDay = { id: nextId(), name: `${prefix} push day`, note: null, trainingDate: '2026-03-10', category: 'UPPER_BODY' as const, weight: 80, ...stamps('2026-03-10T18:00:00.000Z') };
  const legDay = { id: nextId(), name: `${prefix} leg day`, note: null, trainingDate: '2026-03-12', category: 'LEGS' as const, weight: null, ...stamps('2026-03-12T18:00:00.000Z') };
  const bench = { id: nextId(), trainingId: pushDay.id, exerciseTypeId: demoExerciseTypeId('BENCH_PRESS'), position: 1, note: null, rating: 2, ...stamps('2026-03-10T18:05:00.000Z') };
  const facePull = { id: nextId(), trainingId: pushDay.id, exerciseTypeId: demoExerciseTypeId('FACE_PULL'), position: 2, note: null, rating: null, ...stamps('2026-03-10T18:30:00.000Z') };
  const squat = { id: nextId(), trainingId: legDay.id, exerciseTypeId: demoExerciseTypeId('SQUAT'), position: 1, note: null, rating: null, ...stamps('2026-03-12T18:05:00.000Z') };
  const set = (trainingExerciseId: string, position: number, repetitions: number, weight: number, extras: Partial<DemoState['sets'][number]> = {}) => ({
    id: nextId(), trainingExerciseId, position, repetitions, weight, rating: null, note: null, ...stamps(`2026-03-10T18:0${position}:30.000Z`), ...extras,
  });
  return {
    version: 1,
    trainings: [pushDay, legDay],
    exercises: [bench, facePull, squat],
    sets: [
      set(bench.id, 1, 10, 60, { rating: 3, note: 'Last rep was a grind' }),
      set(bench.id, 2, 10, 60),
      set(bench.id, 3, 10, 60),
      set(squat.id, 1, 5, 100),
      set(squat.id, 2, 5, 102.5),
    ],
  };
}

it('starts on the login page and signs in with any credentials, without Keycloak or a backend', async () => {
  renderDemoApp(); // no fixture: exercises the real pseudo-random generator end to end
  expect(await screen.findByRole('button', { name: 'Login' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /^Open / })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Login' }));
  expect(screen.getByRole('form', { name: 'Sign in' })).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Username or email'), 'jane@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'x');
  await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

  expect((await screen.findAllByRole('link', { name: /^Open / })).length).toBeGreaterThanOrEqual(8);
  expect(screen.getByRole('button', { name: 'jane@example.com' })).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
}, UI_FLOW_TIMEOUT);

it('serves a freshly generated data set on every sign-in', async () => {
  let visits = 0;
  renderDemoApp({ seed: () => fixtureState(`Visit ${++visits}`) });

  await signIn('alex');
  expect(await screen.findByRole('link', { name: 'Open Visit 2 push day' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'alex' }));
  await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
  await signIn('alex');
  expect(await screen.findByRole('link', { name: 'Open Visit 3 push day' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Open Visit 2 push day' })).not.toBeInTheDocument();
}, UI_FLOW_TIMEOUT);

it('requires a username and a password before signing in', async () => {
  renderDemoApp();
  await userEvent.click(await screen.findByRole('button', { name: 'Login' }));
  const submit = screen.getByRole('button', { name: 'Sign In' });
  expect(submit).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Username or email'), '   ');
  await userEvent.type(screen.getByLabelText('Password'), 'secret');
  expect(submit).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Username or email'), 'sam');
  await userEvent.type(screen.getByLabelText('Password'), '{Enter}');
  expect(await screen.findByRole('button', { name: 'sam' })).toBeInTheDocument();
}, UI_FLOW_TIMEOUT);

it('returns from the sign-in page to the login screen with Back', async () => {
  renderDemoApp();
  await userEvent.click(await screen.findByRole('button', { name: 'Login' }));
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.queryByRole('form', { name: 'Sign in' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
}, UI_FLOW_TIMEOUT);

it('keeps the sign-in across page reloads until logout', async () => {
  const first = renderDemoApp({ seed: () => fixtureState() });
  await signIn('alex');
  await screen.findByRole('link', { name: 'Open Seeded push day' });
  expect(window.sessionStorage.getItem(DEMO_SESSION_KEY)).toBe('alex');
  first.unmount();

  const reloaded = renderDemoApp({ seed: () => fixtureState() });
  expect(await screen.findByRole('button', { name: 'alex' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'alex' }));
  await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
  expect(await screen.findByRole('button', { name: 'Login' })).toBeInTheDocument();
  expect(window.sessionStorage.getItem(DEMO_SESSION_KEY)).toBeNull();
  reloaded.unmount();

  renderDemoApp({ seed: () => fixtureState() });
  expect(await screen.findByRole('button', { name: 'Login' })).toBeInTheDocument();
}, UI_FLOW_TIMEOUT);

it('still signs in when sessionStorage is unavailable', async () => {
  const failingStorage = {
    getItem: () => { throw new DOMException('Storage disabled', 'SecurityError'); },
    setItem: () => { throw new DOMException('Storage disabled', 'SecurityError'); },
    removeItem: () => { throw new DOMException('Storage disabled', 'SecurityError'); },
  };
  startDemoMode({ storage: null, latencyMs: 0 }); // installs the mock API
  render(<DemoAuthProvider storage={failingStorage}><MemoryRouter><App /></MemoryRouter></DemoAuthProvider>);
  await signIn('offline');
  expect(await screen.findByRole('button', { name: 'offline' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'offline' }));
  await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
  expect(await screen.findByRole('button', { name: 'Login' })).toBeInTheDocument();
}, UI_FLOW_TIMEOUT);

it('records a new workout with exercises and sets, and adjusts them', async () => {
  const demo = renderDemoApp({ seed: () => fixtureState() });
  await signIn();
  await screen.findByRole('link', { name: 'Open Seeded push day' });

  await userEvent.click(screen.getAllByRole('button', { name: 'New Training' })[0]);
  await userEvent.type(screen.getByLabelText('Name'), 'Demo leg day');
  await userEvent.click(screen.getByRole('button', { name: 'Create' }));
  expect(await screen.findByRole('heading', { name: 'Demo leg day' })).toBeInTheDocument();
  expect(screen.getByText('No exercises yet')).toBeInTheDocument();

  await userEvent.click(screen.getAllByRole('button', { name: 'Add Exercise' })[0]);
  const exerciseForm = screen.getByLabelText('Exercise type').closest('form')!;
  await userEvent.type(within(exerciseForm).getByLabelText('Exercise type'), 'front squat');
  await userEvent.click(within(exerciseForm).getByRole('button', { name: /^Front Squat/ }));
  await userEvent.click(within(exerciseForm).getByRole('button', { name: 'Add Exercise' }));
  expect(await screen.findByRole('heading', { name: 'Front Squat' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Add Set' }));
  await userEvent.type(screen.getByLabelText('Weight kg'), '70');
  await userEvent.click(screen.getByRole('button', { name: 'Add 3 Sets' }));
  expect(await screen.findAllByText('10 reps @ 70kg')).toHaveLength(3);

  await userEvent.click(screen.getByRole('button', { name: 'Set exercise rating to 3' }));
  await userEvent.click(screen.getAllByRole('button', { name: 'Delete set' })[0]);
  await waitFor(() => expect(screen.getAllByText('10 reps @ 70kg')).toHaveLength(2));
  await userEvent.click(screen.getAllByRole('button', { name: 'Set rating to 2' })[0]);

  const training = demo.backend.listTrainings().find((item) => item.name === 'Demo leg day')!;
  await waitFor(() => {
    const [exercise] = demo.backend.getTraining(training.id).exercises;
    expect(exercise).toMatchObject({ rating: 3, exerciseType: { code: 'FRONT_SQUAT' } });
    expect(exercise.sets.map(({ position, rating }) => ({ position, rating }))).toEqual([
      { position: 1, rating: 2 },
      { position: 2, rating: null },
    ]);
  });

  await userEvent.click(screen.getByRole('link', { name: 'Back' }));
  expect(await screen.findByRole('link', { name: 'Open Demo leg day' })).toBeInTheDocument();
}, UI_FLOW_TIMEOUT);

it('shows set history per exercise type', async () => {
  renderDemoApp({ seed: () => fixtureState() });
  await signIn();
  await screen.findByRole('link', { name: 'Open Seeded push day' });
  await userEvent.click(screen.getByRole('button', { name: 'Exercise history' }));
  await userEvent.type(await screen.findByLabelText('Exercise type'), 'bench press');
  await userEvent.click(screen.getByRole('button', { name: /^Bench Press/ }));

  expect(await screen.findAllByText('10 reps @ 60kg')).toHaveLength(3);
  expect(screen.getAllByRole('link', { name: 'Seeded push day' })).toHaveLength(3);
  expect(screen.queryByText(/reps @ 10[02]/)).not.toBeInTheDocument(); // squat history is not mixed in
}, UI_FLOW_TIMEOUT);

it('exports every workout, including new changes, as CSV', async () => {
  const demo = renderDemoApp({ seed: () => fixtureState() });
  await signIn();
  await screen.findByRole('link', { name: 'Open Seeded push day' });
  const training = demo.backend.createTraining({ name: 'Fresh session', trainingDate: '2026-03-20', category: 'LEGS' });
  demo.backend.addExercise(training.id, { exerciseTypeId: demoExerciseTypeId('LEG_PRESS'), position: 1 });

  await userEvent.click(screen.getByRole('button', { name: 'alex' }));
  await userEvent.click(screen.getByRole('button', { name: 'Export All CSV' }));

  await waitFor(() => expect(downloadCsv).toHaveBeenCalledOnce());
  const [csv, fileName] = vi.mocked(downloadCsv).mock.calls[0];
  const rows = csv.split('\n');
  expect(fileName).toMatch(/^all-trainings-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(rows[0]).toMatch(/^training_id,training_name,training_date/);
  expect(rows.some((row) => row.includes(',Fresh session,2026-03-20,LEGS,') && row.includes(',LEG_PRESS,Leg Press,'))).toBe(true);
  expect(rows.filter((row) => row.includes(',BENCH_PRESS,'))).toHaveLength(3);
  expect(rows.filter((row) => row.includes(',FACE_PULL,'))).toHaveLength(1); // exercise without sets still exports
  expect(rows.some((row) => row.includes('Last rep was a grind'))).toBe(true);
  expect(rows).toHaveLength(1 + 3 + 1 + 2 + 1); // header + bench sets + face pull + squat sets + fresh session
}, UI_FLOW_TIMEOUT);

it('logs out to the login screen and signs back in as someone else', async () => {
  renderDemoApp({ seed: () => fixtureState() });
  await signIn('alex');
  await userEvent.click(await screen.findByRole('button', { name: 'alex' }));
  await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
  await signIn('morgan', 'other-password');
  expect(await screen.findByRole('link', { name: 'Open Seeded push day' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'morgan' })).toBeInTheDocument();
}, UI_FLOW_TIMEOUT);

it('persists demo data in localStorage by default and follows changes from other tabs', () => {
  const demo = startDemoMode({ latencyMs: 0 });
  expect(window.localStorage.getItem(DEFAULT_DEMO_STORAGE_KEY)).toContain('"version":1');

  const reload = vi.spyOn(demo.backend, 'reload');
  window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
  expect(reload).not.toHaveBeenCalled();
  window.dispatchEvent(new StorageEvent('storage', { key: DEFAULT_DEMO_STORAGE_KEY }));
  expect(reload).toHaveBeenCalledOnce();
});

it('falls back to in-memory data when localStorage is unavailable', () => {
  const storageAccess = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('Storage disabled', 'SecurityError');
  });
  const demo = startDemoMode({ latencyMs: 0 });
  storageAccess.mockRestore();
  expect(demo.backend.listTrainings().length).toBeGreaterThan(0);
  expect(window.localStorage.getItem(DEFAULT_DEMO_STORAGE_KEY)).toBeNull();
});
