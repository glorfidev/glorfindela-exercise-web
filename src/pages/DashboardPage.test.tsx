import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { exerciseApi } from '../api/client';
import { exerciseType, historyItem, training } from '../test/fixtures';
import DashboardPage from './DashboardPage';

vi.mock('../api/client');
const api = vi.mocked(exerciseApi);

beforeEach(() => {
  vi.resetAllMocks();
  api.listTrainings.mockResolvedValue([training()]);
  api.listExerciseTypes.mockResolvedValue([exerciseType()]);
  api.listExerciseSetHistory.mockResolvedValue([historyItem()]);
});

function renderDashboard() {
  return render(<MemoryRouter><Routes>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/trainings/:id" element={<div>Opened training detail</div>} />
  </Routes></MemoryRouter>);
}

it('loads trainings and links to their detail', async () => {
  renderDashboard();
  expect(screen.getByText('Loading trainings')).toBeInTheDocument();
  const link = await screen.findByRole('link', { name: 'Open Morning workout' });
  expect(link).toHaveAttribute('href', '/trainings/training-1');
  await userEvent.click(link);
  expect(screen.getByText('Opened training detail')).toBeInTheDocument();
});

it('shows the empty state and creates a training', async () => {
  api.listTrainings.mockResolvedValue([]);
  api.createTraining.mockResolvedValue(training({ id: 'new' }));
  renderDashboard();
  expect(await screen.findByText('No trainings yet')).toBeInTheDocument();
  await userEvent.click(screen.getAllByRole('button', { name: 'New Training' })[0]);
  await userEvent.type(screen.getByLabelText('Name'), 'New workout');
  await userEvent.click(screen.getByRole('button', { name: 'Create' }));
  expect(api.createTraining).toHaveBeenCalledWith(expect.objectContaining({ name: 'New workout' }));
  expect(await screen.findByText('Opened training detail')).toBeInTheDocument();
});

it('keeps entered values when creating fails', async () => {
  api.createTraining.mockRejectedValue(new Error('Could not save workout'));
  renderDashboard();
  await screen.findByText('Morning workout');
  await userEvent.click(screen.getAllByRole('button', { name: 'New Training' })[0]);
  await userEvent.type(screen.getByLabelText('Name'), 'Keep me');
  await userEvent.click(screen.getByRole('button', { name: 'Create' }));
  expect(await screen.findByText('Could not save workout')).toBeInTheDocument();
  expect(screen.getByLabelText('Name')).toHaveValue('Keep me');
});

it('copies a training with its category and body weight', async () => {
  api.copyTraining.mockResolvedValue(training({ id: 'copied' }));
  renderDashboard();
  await userEvent.click(await screen.findByRole('button', { name: 'Copy Morning workout' }));
  expect(screen.getByLabelText('Name')).toHaveValue('Morning workout copy');
  await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
  expect(api.copyTraining).toHaveBeenCalledWith('training-1', expect.objectContaining({ name: 'Morning workout copy', category: 'UPPER_BODY', weight: 75 }));
  expect(await screen.findByText('Opened training detail')).toBeInTheDocument();
});

it('shows copy errors without closing the form', async () => {
  api.copyTraining.mockRejectedValue(new Error('Copy failed'));
  renderDashboard();
  await userEvent.click(await screen.findByRole('button', { name: 'Copy Morning workout' }));
  await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
  expect(await screen.findByText('Copy failed')).toBeInTheDocument();
  expect(screen.getByLabelText('Name')).toHaveValue('Morning workout copy');
});

it('cancels deletion, then confirms it and refreshes trainings and history', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  api.deleteTraining.mockResolvedValue(undefined);
  renderDashboard();
  const remove = await screen.findByRole('button', { name: 'Delete Morning workout' });
  await waitFor(() => expect(api.listExerciseSetHistory).toHaveBeenCalledTimes(1));
  await userEvent.click(remove);
  expect(api.deleteTraining).not.toHaveBeenCalled();
  api.listTrainings.mockResolvedValue([]);
  await userEvent.click(remove);
  expect(confirm).toHaveBeenCalledTimes(2);
  expect(api.deleteTraining).toHaveBeenCalledWith('training-1');
  expect(await screen.findByText('No trainings yet')).toBeInTheDocument();
  expect(api.listExerciseSetHistory).toHaveBeenCalledTimes(2);
});

it('keeps a training visible when deletion fails', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  api.deleteTraining.mockRejectedValue(new Error('Delete failed'));
  renderDashboard();
  await userEvent.click(await screen.findByRole('button', { name: 'Delete Morning workout' }));
  expect(await screen.findByText('Delete failed')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Delete Morning workout' })).toBeEnabled();
});

it('loads history for the exercise selected by the user', async () => {
  api.listExerciseTypes.mockResolvedValue([exerciseType(), exerciseType({ id: 'squat', name: 'Squat', code: 'SQUAT' })]);
  renderDashboard();
  await screen.findByText('Morning workout');
  await userEvent.click(screen.getByRole('button', { name: 'Exercise history' }));
  expect(await screen.findByText('10 reps @ 50kg')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Squat/ }));
  await waitFor(() => expect(api.listExerciseSetHistory).toHaveBeenLastCalledWith('squat'));
});

it('shows a load error', async () => {
  api.listTrainings.mockRejectedValue(new Error('Server unavailable'));
  renderDashboard();
  expect(await screen.findByText('Server unavailable')).toBeInTheDocument();
  expect(screen.queryByText('No trainings yet')).not.toBeInTheDocument();
});
