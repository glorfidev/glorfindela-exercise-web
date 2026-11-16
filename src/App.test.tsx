import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import App from './App';
import { exerciseApi } from './api/client';
import { useAuth } from './auth/AuthContext';
import { exerciseType, training, trainingDetail } from './test/fixtures';
import { buildTrainingCsv, downloadCsv } from './utils/trainingCsv';

vi.mock('./api/client');
vi.mock('./auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('./utils/trainingCsv', async (importOriginal) => ({ ...await importOriginal<typeof import('./utils/trainingCsv')>(), downloadCsv: vi.fn() }));

const auth = () => ({ initializing: false, authenticated: true, user: { subject: 'user-1', displayName: 'Test User' }, login: vi.fn(), logout: vi.fn(), getToken: vi.fn().mockResolvedValue('token') });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAuth).mockReturnValue(auth());
  vi.mocked(exerciseApi.listTrainings).mockResolvedValue([training()]);
  vi.mocked(exerciseApi.listExerciseTypes).mockResolvedValue([exerciseType()]);
  vi.mocked(exerciseApi.listExerciseSetHistory).mockResolvedValue([]);
  vi.mocked(exerciseApi.getTraining).mockResolvedValue(trainingDetail());
});

function renderApp() { return render(<MemoryRouter><App /></MemoryRouter>); }

it('shows session loading without requesting protected data', () => {
  vi.mocked(useAuth).mockReturnValue({ ...auth(), initializing: true, authenticated: false });
  renderApp();
  expect(screen.getByText('Checking session')).toBeInTheDocument();
  expect(exerciseApi.listTrainings).not.toHaveBeenCalled();
});

it('offers login to signed-out users', async () => {
  const session = { ...auth(), authenticated: false };
  vi.mocked(useAuth).mockReturnValue(session);
  renderApp();
  await userEvent.click(screen.getByRole('button', { name: 'Login' }));
  expect(session.login).toHaveBeenCalledOnce();
  expect(exerciseApi.listTrainings).not.toHaveBeenCalled();
});

it('shows authentication errors', () => {
  vi.mocked(useAuth).mockReturnValue({ ...auth(), authenticated: false, error: 'Login unavailable' });
  renderApp();
  expect(screen.getByText('Login unavailable')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Login' })).not.toBeInTheDocument();
});

it('opens and closes the account menu with Escape or an outside click and logs out', async () => {
  const session = auth();
  vi.mocked(useAuth).mockReturnValue(session);
  renderApp();
  await screen.findByText('Morning workout');
  const menu = screen.getByRole('button', { name: 'Test User' });
  await userEvent.click(menu);
  expect(menu).toHaveAttribute('aria-expanded', 'true');
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
  await userEvent.click(menu);
  fireEvent.mouseDown(document.body);
  expect(menu).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(menu);
  await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
  expect(session.logout).toHaveBeenCalledOnce();
});

it('exports details for all workouts as one CSV', async () => {
  const second = training({ id: 'training-2', name: 'Second workout' });
  const details = [trainingDetail(), trainingDetail({ training: second, exercises: [] })];
  vi.mocked(exerciseApi.listTrainings).mockResolvedValue([training(), second]);
  vi.mocked(exerciseApi.getTraining).mockImplementation(async (id) => details.find((detail) => detail.training.id === id)!);
  renderApp();
  await screen.findByText('Morning workout');
  await userEvent.click(screen.getByRole('button', { name: 'Test User' }));
  await userEvent.click(screen.getByRole('button', { name: 'Export All CSV' }));
  expect(exerciseApi.getTraining).toHaveBeenCalledWith('training-1');
  expect(exerciseApi.getTraining).toHaveBeenCalledWith('training-2');
  expect(downloadCsv).toHaveBeenCalledWith(buildTrainingCsv(details), expect.stringMatching(/^all-trainings-\d{4}-\d{2}-\d{2}\.csv$/));
  expect(screen.queryByRole('button', { name: 'Export All CSV' })).not.toBeInTheDocument();
});

it('shows export failures without downloading a partial CSV', async () => {
  vi.mocked(exerciseApi.getTraining).mockRejectedValue(new Error('Export failed'));
  renderApp();
  await screen.findByText('Morning workout');
  await userEvent.click(screen.getByRole('button', { name: 'Test User' }));
  await userEvent.click(screen.getByRole('button', { name: 'Export All CSV' }));
  expect(await screen.findByText('Export failed')).toBeInTheDocument();
  expect(downloadCsv).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Export All CSV' })).toBeEnabled();
});
