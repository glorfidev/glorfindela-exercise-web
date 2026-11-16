import { ChevronDown, Dumbbell, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ExerciseSet, TrainingExercise, UpdateExerciseSetRequest, UpdateTrainingExerciseRequest } from '../types/api';
import { ExerciseTypePicture } from './AddExerciseForm';
import Button from './Button';
import SetList from './SetList';
import { TextArea } from './Input';

type ExerciseCardProps = {
  exercise: TrainingExercise;
  expanded: boolean;
  onAddSet: (exercise: TrainingExercise) => void;
  onExpandedChange: (exerciseId: string, expanded: boolean) => void;
  onUpdate: (exerciseId: string, request: UpdateTrainingExerciseRequest) => Promise<void>;
  onUpdateSet: (setId: string, request: UpdateExerciseSetRequest) => Promise<void>;
  onReorderSets: (orderedSets: TrainingExercise['sets']) => Promise<void>;
  onDeleteExercise: (exercise: TrainingExercise) => void;
  onDeleteSet: (set: ExerciseSet) => void;
  deletingExerciseId?: string | null;
  deletingSetId?: string | null;
};

const ratings = [1, 2, 3];

export default function ExerciseCard({
  deletingExerciseId = null,
  deletingSetId = null,
  exercise,
  expanded,
  onAddSet,
  onDeleteExercise,
  onDeleteSet,
  onExpandedChange,
  onReorderSets,
  onUpdate,
  onUpdateSet,
}: ExerciseCardProps) {
  const [rating, setRating] = useState(exercise.rating ?? 0);
  const [note, setNote] = useState(exercise.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSummaries = summarizeSetRows(exercise);

  useEffect(() => {
    setRating(exercise.rating ?? 0);
    setNote(exercise.note ?? '');
  }, [exercise.id, exercise.rating, exercise.note]);

  async function save(next: { rating?: number; note?: string }) {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(exercise.id, {
        position: exercise.position,
        rating: next.rating === undefined ? (rating || null) : (next.rating || null),
        note: next.note === undefined ? (note.trim() || null) : (next.note.trim() || null),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save exercise');
    } finally {
      setSaving(false);
    }
  }

  async function selectRating(nextRating: number) {
    const value = nextRating === rating ? 0 : nextRating;
    setRating(value);
    await save({ rating: value });
  }

  async function saveNote() {
    if ((exercise.note ?? '') === note.trim()) return;
    await save({ note });
  }

  return (
    <article className="rounded-3xl border border-white bg-white/85 p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <button type="button" onClick={() => onExpandedChange(exercise.id, !expanded)} className="focus-ring min-w-0 rounded-2xl text-left">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-mint-50 text-mint-600">
              <ChevronDown size={18} className={`transition ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
            </span>
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-mint-100 bg-white shadow-sm">
              <ExerciseTypePicture type={exercise.exerciseType} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-ink">{exercise.exerciseType.name}</h3>
              <p className="text-sm font-medium text-muted">{exercise.exerciseType.category ?? exercise.exerciseType.code}</p>
              {!expanded && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-muted">
                  <span className="rounded-full bg-mint-50 px-3 py-1">{exercise.sets.length} {exercise.sets.length === 1 ? 'row' : 'rows'}</span>
                  <span className="rounded-full bg-mint-50 px-3 py-1">{rating ? `${rating}/3` : 'No rating'}</span>
                  {setSummaries.visible.map((summary) => (
                    <span key={summary} className="rounded-full bg-mint-50 px-3 py-1">{summary}</span>
                  ))}
                  {setSummaries.hiddenCount > 0 && <span className="rounded-full bg-mint-50 px-3 py-1">+{setSummaries.hiddenCount} more</span>}
                  {exercise.note && <span className="rounded-full bg-mint-50 px-3 py-1">Note</span>}
                </div>
              )}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDeleteExercise(exercise)}
            disabled={deletingExerciseId === exercise.id}
            aria-label={`Delete ${exercise.exerciseType.name}`}
            className="focus-ring grid h-11 w-11 place-items-center rounded-2xl bg-white text-muted shadow-sm transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 size={17} aria-hidden="true" />
          </button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onExpandedChange(exercise.id, true);
              onAddSet(exercise);
            }}
            icon={<Plus size={16} aria-hidden="true" />}
          >
            Add Set
          </Button>
        </div>
      </div>
      {expanded && (
        <div>
          <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-mint-50/80 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1" aria-label="Exercise rating">
              {ratings.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Set exercise rating to ${value}`}
                  aria-pressed={value <= rating}
                  disabled={saving}
                  onClick={() => selectRating(value)}
                  className={`focus-ring grid h-10 w-10 place-items-center rounded-2xl transition ${
                    value <= rating ? 'bg-mint-300 text-ink shadow-sm' : 'bg-white text-muted hover:bg-mint-100 hover:text-ink'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <Dumbbell size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-muted">{saving ? 'Saving' : rating ? `${rating}/3` : 'No rating'}</p>
          </div>
          <div className="mt-3">
            <TextArea
              label="Exercise note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onBlur={saveNote}
              placeholder="Grip, tempo, setup..."
              className="min-h-20 bg-white/90"
            />
            {error && <p className="mt-2 text-sm font-bold text-red-600">{error}</p>}
          </div>
          <div className="mt-4">
            <SetList
              sets={exercise.sets}
              onUpdateSet={onUpdateSet}
              onReorderSets={onReorderSets}
              onDeleteSet={onDeleteSet}
              deletingSetId={deletingSetId}
            />
          </div>
        </div>
      )}
    </article>
  );
}

function summarizeSetRows(exercise: TrainingExercise) {
  const visible = exercise.sets.slice(0, 3).map((set) => `${set.repetitions} reps @ ${set.weight}kg`);
  return {
    visible,
    hiddenCount: Math.max(exercise.sets.length - visible.length, 0),
  };
}
