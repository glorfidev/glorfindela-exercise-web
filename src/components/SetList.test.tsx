import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { exerciseSet } from '../test/fixtures';
import SetList from './SetList';

function props() {
  return { sets: [exerciseSet()], onUpdateSet: vi.fn().mockResolvedValue(undefined), onReorderSets: vi.fn().mockResolvedValue(undefined), onDeleteSet: vi.fn() };
}

it('shows an empty state', () => {
  render(<SetList {...props()} sets={[]} />);
  expect(screen.getByText('No sets added yet.')).toBeInTheDocument();
});

it('saves and clears a rating without changing other set fields', async () => {
  const options = props();
  render(<SetList {...options} />);
  await userEvent.click(screen.getByRole('button', { name: 'Set rating to 2' }));
  expect(options.onUpdateSet).toHaveBeenLastCalledWith('set-1', { position: 1, repetitions: 10, weight: 50, rating: 2, note: null });
  await userEvent.click(screen.getByRole('button', { name: 'Set rating to 2' }));
  expect(options.onUpdateSet).toHaveBeenLastCalledWith('set-1', expect.objectContaining({ rating: null }));
  expect(screen.getByText('No rating')).toBeInTheDocument();
});

it('shows rating errors and enables retry', async () => {
  const options = props();
  options.onUpdateSet.mockRejectedValueOnce(new Error('Save failed'));
  render(<SetList {...options} />);
  await userEvent.click(screen.getByRole('button', { name: 'Set rating to 1' }));
  expect(await screen.findByText('Save failed')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Set rating to 1' })).toBeEnabled();
});

it('passes the selected set to deletion and disables controls while deleting', async () => {
  const options = props();
  const { rerender } = render(<SetList {...options} />);
  await userEvent.click(screen.getByRole('button', { name: 'Delete set' }));
  expect(options.onDeleteSet).toHaveBeenCalledWith(options.sets[0]);
  rerender(<SetList {...options} deletingSetId="set-1" />);
  expect(screen.getByRole('button', { name: 'Delete set' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Set rating to 3' })).toBeDisabled();
});

it('reorders dragged sets without mutating the input', async () => {
  const options = props();
  options.sets.push(exerciseSet({ id: 'set-2', position: 2, weight: 60 }));
  render(<SetList {...options} />);
  const rows = screen.getAllByRole('listitem');
  fireEvent.dragStart(rows[0]);
  fireEvent.dragOver(rows[1]);
  fireEvent.drop(rows[1]);
  await waitFor(() => expect(options.onReorderSets).toHaveBeenCalledWith([options.sets[1], options.sets[0]]));
  expect(options.sets.map((set) => set.id)).toEqual(['set-1', 'set-2']);
});

it('ignores dropping on the same row and displays reorder failures', async () => {
  const options = props();
  options.sets.push(exerciseSet({ id: 'set-2', position: 2 }));
  options.onReorderSets.mockRejectedValueOnce(new Error('Reorder failed'));
  render(<SetList {...options} />);
  const rows = screen.getAllByRole('listitem');
  fireEvent.dragStart(rows[0]);
  fireEvent.drop(rows[0]);
  expect(options.onReorderSets).not.toHaveBeenCalled();
  fireEvent.dragStart(rows[0]);
  fireEvent.drop(rows[1]);
  expect(await screen.findByText('Reorder failed')).toBeInTheDocument();
});
