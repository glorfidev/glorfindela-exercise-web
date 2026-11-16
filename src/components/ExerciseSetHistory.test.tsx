import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { exerciseType, historyItem, training } from '../test/fixtures';
import ExerciseSetHistory from './ExerciseSetHistory';

function props() {
  return {
    exerciseTypes: [exerciseType()], selectedExerciseTypeId: 'type-1', history: [historyItem()],
    loadingExerciseTypes: false, loadingHistory: false, exerciseTypesError: null, historyError: null, onSelectExerciseType: vi.fn(),
  };
}

it('shows recorded sets, ratings and a link to the workout', () => {
  const item = historyItem({ exerciseRating: 3 });
  item.set.rating = 2;
  render(<MemoryRouter><ExerciseSetHistory {...props()} history={[item]} /></MemoryRouter>);
  expect(screen.getByText('10 reps @ 50kg')).toBeInTheDocument();
  expect(screen.getByText('Exercise 3/3')).toBeInTheDocument();
  expect(screen.getByText('Set 2/3')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Morning workout' })).toHaveAttribute('href', '/trainings/training-1');
});

it('uses a fallback name for unnamed trainings', () => {
  render(<MemoryRouter><ExerciseSetHistory {...props()} history={[historyItem({ training: training({ name: '' }) })]} /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Untitled training' })).toBeInTheDocument();
});

it('distinguishes loading, failure and empty history', () => {
  const options = props();
  const { rerender } = render(<MemoryRouter><ExerciseSetHistory {...options} loadingHistory /></MemoryRouter>);
  expect(screen.getByText('Loading set history')).toBeInTheDocument();
  expect(screen.queryByText('10 reps @ 50kg')).not.toBeInTheDocument();
  rerender(<MemoryRouter><ExerciseSetHistory {...options} historyError="History unavailable" /></MemoryRouter>);
  expect(screen.getByText('History unavailable')).toBeInTheDocument();
  expect(screen.queryByText('No sets recorded for this exercise type yet.')).not.toBeInTheDocument();
  rerender(<MemoryRouter><ExerciseSetHistory {...options} history={[]} /></MemoryRouter>);
  expect(screen.getByText('No sets recorded for this exercise type yet.')).toBeInTheDocument();
});

it('disables search while types load or when there are no exercise types', () => {
  const { rerender } = render(<MemoryRouter><ExerciseSetHistory {...props()} loadingExerciseTypes /></MemoryRouter>);
  expect(screen.getByLabelText('Exercise type')).toBeDisabled();
  rerender(<MemoryRouter><ExerciseSetHistory {...props()} exerciseTypes={[]} exerciseTypesError="Types unavailable" /></MemoryRouter>);
  expect(screen.getByLabelText('Exercise type')).toBeDisabled();
  expect(screen.getByText('Types unavailable')).toBeInTheDocument();
});

it('searches case-insensitively by category, clears search on selection and shows no matches', async () => {
  const options = props();
  const squat = exerciseType({ id: 'squat', name: 'Squat', code: 'SQUAT', category: 'Legs' });
  render(<MemoryRouter><ExerciseSetHistory {...options} exerciseTypes={[...options.exerciseTypes, squat]} /></MemoryRouter>);
  const user = userEvent.setup();
  const search = screen.getByLabelText('Exercise type');
  await user.type(search, ' LEGS ');
  expect(screen.queryByRole('button', { name: /Bench Press/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Squat/ }));
  expect(options.onSelectExerciseType).toHaveBeenCalledWith('squat');
  expect(search).toHaveValue('');
  await user.type(search, 'nonexistent exercise');
  expect(screen.getByText('No exercise found.')).toBeInTheDocument();
});

it('reveals additional exercise suggestions', async () => {
  const types = Array.from({ length: 15 }, (_, i) => exerciseType({ id: `type-${i}`, name: `Exercise ${i}`, timesTrained: i }));
  render(<MemoryRouter><ExerciseSetHistory {...props()} exerciseTypes={types} /></MemoryRouter>);
  expect(screen.queryByRole('button', { name: /Exercise 8 / })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Show more results' }));
  expect(screen.getByRole('button', { name: /Exercise 8 / })).toBeInTheDocument();
});
