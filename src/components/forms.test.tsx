import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { deferred, exerciseType } from '../test/fixtures';
import AddExerciseForm from './AddExerciseForm';
import AddSetForm from './AddSetForm';
import CreateTrainingForm from './CreateTrainingForm';
import { Input } from './Input';

it('creates a training with trimmed name, selected category and numeric body weight', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<CreateTrainingForm initialDate="2026-01-10" onSubmit={onSubmit} onCancel={vi.fn()} />);
  await user.type(screen.getByLabelText('Name'), '  Leg day  ');
  await user.click(screen.getByRole('radio', { name: /legs/i }));
  await user.type(screen.getByLabelText('Your weight (kg)'), '74.5');
  await user.click(screen.getByRole('button', { name: 'Create' }));
  expect(onSubmit).toHaveBeenCalledWith({ name: 'Leg day', trainingDate: '2026-01-10', category: 'LEGS', weight: 74.5, note: null });
});

it('uses defaults for an unnamed training and empty weight', async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<CreateTrainingForm initialDate="2026-01-10" onSubmit={onSubmit} onCancel={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Create' }));
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Training', weight: null, category: 'WHOLE_BODY' }));
});

it('prepopulates copied training values and prevents duplicate submissions while saving', async () => {
  const pending = deferred<void>();
  const onSubmit = vi.fn(() => pending.promise);
  render(<CreateTrainingForm initialDate="2026-01-10" initialName="Copy" initialCategory="LEGS" initialWeight={72} submitLabel="Copy" onSubmit={onSubmit} onCancel={vi.fn()} />);
  expect(screen.getByLabelText('Name')).toHaveValue('Copy');
  expect(screen.getByLabelText('Your weight (kg)')).toHaveValue(72);
  await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
  expect(screen.getByRole('button', { name: 'Saving' })).toBeDisabled();
  await act(async () => pending.resolve());
  expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled();
  expect(onSubmit).toHaveBeenCalledTimes(1);
});

it('cancels a training without submitting', async () => {
  const onCancel = vi.fn();
  const onSubmit = vi.fn();
  render(<CreateTrainingForm onCancel={onCancel} onSubmit={onSubmit} />);
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onCancel).toHaveBeenCalledOnce();
  expect(onSubmit).not.toHaveBeenCalled();
});

it.each(['', '-1', 'abc', 'Infinity'])('does not submit invalid set weight %j', async (weight) => {
  const onSubmit = vi.fn();
  render(<AddSetForm nextPosition={1} onSubmit={onSubmit} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Weight kg'), { target: { value: weight } });
  expect(screen.getByRole('button', { name: 'Add 3 Sets' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Add 3 Sets' }));
  expect(onSubmit).not.toHaveBeenCalled();
});

it.each([['52,5', 52.5], ['52.5', 52.5], ['0', 0]])('adds consecutively positioned sets with weight %s', async (input, weight) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<AddSetForm nextPosition={4} onSubmit={onSubmit} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Weight kg'), { target: { value: input } });
  fireEvent.change(screen.getByLabelText('Sets to add'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Repetitions'), { target: { value: '8' } });
  await userEvent.click(screen.getByRole('button', { name: 'Add 2 Sets' }));
  expect(onSubmit).toHaveBeenCalledWith([
    { position: 4, repetitions: 8, weight, rating: null, note: null },
    { position: 5, repetitions: 8, weight, rating: null, note: null },
  ]);
});

it('searches exercises by Slovak name and submits the selected exercise', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<AddExerciseForm exerciseTypes={[exerciseType(), exerciseType({ id: 'squat', code: 'SQUAT', name: 'Squat' })]} nextPosition={5} onSubmit={onSubmit} onCancel={vi.fn()} />);
  await user.type(screen.getByLabelText('Exercise type'), 'tlaky na lavičke');
  expect(screen.getByRole('button', { name: /Bench Press/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Squat/ })).not.toBeInTheDocument();
  await user.clear(screen.getByLabelText('Exercise type'));
  await user.click(screen.getByRole('button', { name: /Squat/ }));
  await user.click(screen.getByRole('button', { name: 'Add Exercise' }));
  expect(onSubmit).toHaveBeenCalledWith({ exerciseTypeId: 'squat', position: 5, rating: null, note: null });
});

it('defaults to the most frequently trained exercise and shows more search results', async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const types = Array.from({ length: 7 }, (_, i) => exerciseType({ id: `type-${i}`, name: `Exercise ${i}`, timesTrained: i }));
  render(<AddExerciseForm exerciseTypes={types} nextPosition={1} onSubmit={onSubmit} onCancel={vi.fn()} />);
  expect(screen.queryByRole('button', { name: /Exercise 0/ })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Show more results' }));
  expect(screen.getByRole('button', { name: /Exercise 0/ })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Add Exercise' }));
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ exerciseTypeId: 'type-6' }));
});

it('disables adding when no exercise types are available and selects types loaded later', async () => {
  const props = { nextPosition: 1, onSubmit: vi.fn().mockResolvedValue(undefined), onCancel: vi.fn() };
  const { rerender } = render(<AddExerciseForm {...props} exerciseTypes={[]} />);
  expect(screen.getByRole('button', { name: 'Add Exercise' })).toBeDisabled();
  expect(screen.getByText('No exercise found.')).toBeInTheDocument();
  rerender(<AddExerciseForm {...props} exerciseTypes={[exerciseType()]} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Add Exercise' })).toBeEnabled());
});

it('steps decimal input values accurately and clamps them to bounds', async () => {
  const onStep = vi.fn();
  const { rerender } = render(<Input label="Weight" value="0,2" step="0.1" min={0} max={0.25} onStep={onStep} onChange={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Increase weight' }));
  expect(onStep).toHaveBeenLastCalledWith(0.25);
  await userEvent.click(screen.getByRole('button', { name: 'Decrease weight' }));
  expect(onStep).toHaveBeenLastCalledWith(0.1);
  rerender(<Input label="Weight" value={0} min={0} onStep={onStep} readOnly />);
  expect(screen.getByRole('button', { name: 'Decrease weight' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Increase weight' })).toBeDisabled();
});
