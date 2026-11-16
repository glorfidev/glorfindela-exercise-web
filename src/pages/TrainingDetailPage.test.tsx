import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { exerciseApi } from '../api/client';
import { exercise, exerciseSet, exerciseType, trainingDetail } from '../test/fixtures';
import TrainingDetailPage from './TrainingDetailPage';

vi.mock('../api/client');
const api = vi.mocked(exerciseApi);

beforeEach(() => {
  vi.resetAllMocks();
  api.getTraining.mockResolvedValue(trainingDetail());
  api.listExerciseTypes.mockResolvedValue([exerciseType()]);
  api.addExercise.mockResolvedValue(exercise());
  api.addSet.mockResolvedValue(exerciseSet());
  api.updateExercise.mockResolvedValue(exercise());
  api.updateSet.mockResolvedValue(exerciseSet());
  api.deleteExercise.mockResolvedValue(undefined);
  api.deleteSet.mockResolvedValue(undefined);
});

function renderDetail() {
  return render(<MemoryRouter initialEntries={['/trainings/training-1']}><Routes>
    <Route path="/trainings/:id" element={<TrainingDetailPage />} />
  </Routes></MemoryRouter>);
}

async function expandExercise() {
  await userEvent.click(await screen.findByRole('button', { name: /^Bench Press/ }));
}

it('loads the route training and expands its sets', async () => {
  renderDetail();
  expect(screen.getByText('Loading training')).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Morning workout' })).toBeInTheDocument();
  expect(api.getTraining).toHaveBeenCalledWith('training-1');
  await expandExercise();
  expect(screen.getByLabelText('Exercise note')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Delete set' })).toBeInTheDocument();
});

it('adds an exercise after the highest existing position', async () => {
  api.getTraining.mockResolvedValue(trainingDetail({ exercises: [exercise({ position: 4 })] }));
  renderDetail();
  await screen.findByRole('heading', { name: 'Morning workout' });
  await userEvent.click(screen.getAllByRole('button', { name: 'Add Exercise' })[0]);
  const form = screen.getByLabelText('Exercise type').closest('form')!;
  await userEvent.click(within(form).getByRole('button', { name: 'Add Exercise' }));
  expect(api.addExercise).toHaveBeenCalledWith('training-1', { exerciseTypeId: 'type-1', position: 5, rating: null, note: null });
  await waitFor(() => expect(api.getTraining).toHaveBeenCalledTimes(2));
  expect(screen.queryByLabelText('Exercise type')).not.toBeInTheDocument();
});

it('adds grouped sets and leaves the exercise expanded after reloading', async () => {
  renderDetail();
  await userEvent.click(await screen.findByRole('button', { name: 'Add Set' }));
  await userEvent.type(screen.getByLabelText('Weight kg'), '60');
  await userEvent.click(screen.getByRole('button', { name: 'Add 3 Sets' }));
  expect(api.addSet.mock.calls).toEqual([2, 3, 4].map((position) => ['exercise-1', { position, repetitions: 10, weight: 60, rating: null, note: null }]));
  await waitFor(() => expect(api.getTraining).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText('Exercise note')).toBeInTheDocument();
  expect(screen.queryByLabelText('Weight kg')).not.toBeInTheDocument();
});

it('shows an add-set failure without losing the entered weight', async () => {
  api.addSet.mockRejectedValue(new Error('Set save failed'));
  renderDetail();
  await userEvent.click(await screen.findByRole('button', { name: 'Add Set' }));
  await userEvent.type(screen.getByLabelText('Weight kg'), '60');
  await userEvent.click(screen.getByRole('button', { name: 'Add 3 Sets' }));
  expect(await screen.findByText('Set save failed')).toBeInTheDocument();
  expect(screen.getByLabelText('Weight kg')).toHaveValue('60');
  expect(api.getTraining).toHaveBeenCalledTimes(1);
});

it('saves a trimmed note on blur and ignores unchanged notes', async () => {
  renderDetail();
  await expandExercise();
  const note = screen.getByLabelText('Exercise note');
  fireEvent.blur(note);
  expect(api.updateExercise).not.toHaveBeenCalled();
  await userEvent.type(note, '  Slow tempo  ');
  fireEvent.blur(note);
  await waitFor(() => expect(api.updateExercise).toHaveBeenCalledWith('exercise-1', { position: 1, rating: null, note: 'Slow tempo' }));
  await waitFor(() => expect(api.getTraining).toHaveBeenCalledTimes(2));
});

it('saves exercise and set ratings', async () => {
  renderDetail();
  await expandExercise();
  await userEvent.click(screen.getByRole('button', { name: 'Set exercise rating to 3' }));
  expect(api.updateExercise).toHaveBeenCalledWith('exercise-1', { position: 1, rating: 3, note: null });
  await userEvent.click(screen.getByRole('button', { name: 'Set rating to 2' }));
  expect(api.updateSet).toHaveBeenCalledWith('set-1', { position: 1, repetitions: 10, weight: 50, rating: 2, note: null });
});

it('shows exercise save failures', async () => {
  api.updateExercise.mockRejectedValue(new Error('Rating failed'));
  renderDetail();
  await expandExercise();
  await userEvent.click(screen.getByRole('button', { name: 'Set exercise rating to 1' }));
  expect(await screen.findByText('Rating failed')).toBeInTheDocument();
});

it.each(['exercise', 'set'])('requires confirmation before deleting a %s and refreshes on success', async (kind) => {
  vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  renderDetail();
  await expandExercise();
  const button = screen.getByRole('button', { name: kind === 'exercise' ? 'Delete Bench Press' : 'Delete set' });
  const remove = kind === 'exercise' ? api.deleteExercise : api.deleteSet;
  await userEvent.click(button);
  expect(remove).not.toHaveBeenCalled();
  await userEvent.click(button);
  expect(remove).toHaveBeenCalledWith(kind === 'exercise' ? 'exercise-1' : 'set-1');
  await waitFor(() => expect(api.getTraining).toHaveBeenCalledTimes(2));
});

it.each(['exercise', 'set'])('shows a failed %s deletion', async (kind) => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const remove = kind === 'exercise' ? api.deleteExercise : api.deleteSet;
  remove.mockRejectedValue(new Error('Cannot delete'));
  renderDetail();
  await expandExercise();
  await userEvent.click(screen.getByRole('button', { name: kind === 'exercise' ? 'Delete Bench Press' : 'Delete set' }));
  expect(await screen.findByText('Cannot delete')).toBeInTheDocument();
  expect(api.getTraining).toHaveBeenCalledTimes(1);
});

it('moves reordered sets to temporary positions before writing their final order', async () => {
  api.getTraining.mockResolvedValue(trainingDetail({ exercises: [exercise({ sets: [exerciseSet(), exerciseSet({ id: 'set-2', position: 2, weight: 60 })] })] }));
  renderDetail();
  await expandExercise();
  const rows = screen.getAllByRole('listitem');
  fireEvent.dragStart(rows[0]);
  fireEvent.drop(rows[1]);
  await waitFor(() => expect(api.getTraining).toHaveBeenCalledTimes(2));
  expect(api.updateSet.mock.calls.map(([id, request]) => [id, request.position])).toEqual([
    ['set-2', 100000], ['set-1', 100001], ['set-2', 1], ['set-1', 2],
  ]);
});

it('shows an empty workout and load failures', async () => {
  api.getTraining.mockResolvedValue(trainingDetail({ exercises: [] }));
  const { unmount } = renderDetail();
  expect(await screen.findByText('No exercises yet')).toBeInTheDocument();
  unmount();
  api.getTraining.mockRejectedValue(new Error('Training unavailable'));
  renderDetail();
  expect(await screen.findByText('Training unavailable')).toBeInTheDocument();
});
