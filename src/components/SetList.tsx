import { Dumbbell, GripVertical, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ExerciseSet, UpdateExerciseSetRequest } from '../types/api';

type SetListProps = {
  sets: ExerciseSet[];
  onUpdateSet: (setId: string, request: UpdateExerciseSetRequest) => Promise<void>;
  onReorderSets: (orderedSets: ExerciseSet[]) => Promise<void>;
  onDeleteSet: (set: ExerciseSet) => void;
  deletingSetId?: string | null;
};

const ratings = [1, 2, 3];

export default function SetList({ deletingSetId = null, onDeleteSet, onUpdateSet, onReorderSets, sets }: SetListProps) {
  const [draggedSetId, setDraggedSetId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sets.length === 0) {
    return <p className="rounded-2xl bg-mint-50 px-4 py-3 text-sm font-medium text-muted">No sets added yet.</p>;
  }

  async function dropOn(targetSetId: string) {
    if (!draggedSetId || draggedSetId === targetSetId) {
      setDraggedSetId(null);
      setDropTargetId(null);
      return;
    }

    const draggedIndex = sets.findIndex((set) => set.id === draggedSetId);
    const targetIndex = sets.findIndex((set) => set.id === targetSetId);
    if (draggedIndex < 0 || targetIndex < 0) return;

    const nextSets = [...sets];
    const [draggedSet] = nextSets.splice(draggedIndex, 1);
    nextSets.splice(targetIndex, 0, draggedSet);

    setReordering(true);
    setError(null);
    try {
      await onReorderSets(nextSets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reorder sets');
    } finally {
      setReordering(false);
      setDraggedSetId(null);
      setDropTargetId(null);
    }
  }

  return (
    <>
      <ul className="space-y-2">
        {sets.map((set) => (
          <li
            key={set.id}
            draggable={!reordering}
            onDragStart={() => setDraggedSetId(set.id)}
            onDragOver={(event) => {
              event.preventDefault();
              setDropTargetId(set.id);
            }}
            onDragLeave={() => setDropTargetId((current) => (current === set.id ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              void dropOn(set.id);
            }}
            onDragEnd={() => {
              setDraggedSetId(null);
              setDropTargetId(null);
            }}
            className={`flex flex-col gap-3 rounded-2xl bg-mint-50 px-4 py-3 transition sm:flex-row sm:items-center sm:justify-between ${
              dropTargetId === set.id ? 'ring-2 ring-mint-300' : ''
            } ${draggedSetId === set.id ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center gap-2">
              <GripVertical size={16} className="shrink-0 cursor-grab text-muted" aria-hidden="true" />
              <span className="text-sm font-bold text-ink">
                {set.repetitions} reps @ {set.weight}kg
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SetRating set={set} onUpdateSet={onUpdateSet} disabled={reordering || deletingSetId === set.id} />
              <button
                type="button"
                onClick={() => onDeleteSet(set)}
                disabled={reordering || deletingSetId === set.id}
                aria-label="Delete set"
                className="focus-ring grid h-8 w-8 place-items-center rounded-xl bg-white text-muted shadow-sm transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {(reordering || error) && <p className={`mt-2 text-xs font-bold ${error ? 'text-red-600' : 'text-muted'}`}>{error ?? 'Reordering sets'}</p>}
    </>
  );
}

function SetRating({ set, onUpdateSet, disabled = false }: { set: ExerciseSet; onUpdateSet: SetListProps['onUpdateSet']; disabled?: boolean }) {
  const [rating, setRating] = useState(set.rating ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRating(set.rating ?? 0);
  }, [set.id, set.rating]);

  async function selectRating(nextRating: number) {
    const value = nextRating === rating ? 0 : nextRating;
    setRating(value);
    setSaving(true);
    setError(null);
    try {
      await onUpdateSet(set.id, {
        position: set.position,
        repetitions: set.repetitions,
        weight: set.weight,
        rating: value || null,
        note: set.note ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save rating');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1" aria-label="Set rating">
        {ratings.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`Set rating to ${value}`}
            aria-pressed={value <= rating}
            disabled={saving || disabled}
            onClick={() => selectRating(value)}
            className={`focus-ring grid h-8 w-8 place-items-center rounded-xl transition ${
              value <= rating ? 'bg-mint-300 text-ink shadow-sm' : 'bg-white text-muted hover:bg-mint-100 hover:text-ink'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <Dumbbell size={15} aria-hidden="true" />
          </button>
        ))}
      </div>
      <span className="text-xs font-bold text-muted">{saving ? 'Saving' : rating ? `${rating}/3` : 'No rating'}</span>
      {error && <span className="text-xs font-bold text-red-600">{error}</span>}
    </div>
  );
}
