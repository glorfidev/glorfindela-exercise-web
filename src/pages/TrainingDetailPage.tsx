import { ArrowLeft, Plus, Scale } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { exerciseApi } from '../api/client';
import AddExerciseForm from '../components/AddExerciseForm';
import AddSetForm from '../components/AddSetForm';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import ExerciseCard from '../components/ExerciseCard';
import LoadingState from '../components/LoadingState';
import Modal from '../components/Modal';
import TrainingThumbnail from '../components/TrainingThumbnail';
import { useAsync } from '../hooks/useAsync';
import type {
  CreateExerciseSetRequest,
  CreateTrainingExerciseRequest,
  TrainingExercise,
  ExerciseSet,
  UpdateExerciseSetRequest,
  UpdateTrainingExerciseRequest,
} from '../types/api';

export default function TrainingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [setTarget, setSetTarget] = useState<TrainingExercise | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null);
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null);
  const [expandedExerciseIds, setExpandedExerciseIds] = useState<Set<string>>(() => new Set());

  const trainingState = useAsync(() => exerciseApi.getTraining(id!), [id]);
  const exerciseTypesState = useAsync(exerciseApi.listExerciseTypes, []);

  const training = trainingState.data?.training;
  const exercises = trainingState.data?.exercises ?? [];
  const nextExercisePosition = exercises.reduce((maxPosition, exercise) => Math.max(maxPosition, exercise.position), 0) + 1;

  function setExerciseExpanded(exerciseId: string, expanded: boolean) {
    setExpandedExerciseIds((current) => {
      const next = new Set(current);
      if (expanded) {
        next.add(exerciseId);
      } else {
        next.delete(exerciseId);
      }
      return next;
    });
  }

  async function reloadTrainingInPlace() {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    await trainingState.reload({ showLoading: false });
    window.requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
  }

  async function addExercise(request: CreateTrainingExerciseRequest) {
    if (!id) return;
    setFormError(null);
    try {
      await exerciseApi.addExercise(id, request);
      setExerciseModalOpen(false);
      await reloadTrainingInPlace();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add exercise');
    }
  }

  async function addSet(requests: CreateExerciseSetRequest[]) {
    if (!setTarget) return;
    setFormError(null);
    try {
      await Promise.all(requests.map((request) => exerciseApi.addSet(setTarget.id, request)));
      setExerciseExpanded(setTarget.id, true);
      setSetTarget(null);
      await reloadTrainingInPlace();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add sets');
    }
  }

  async function updateExercise(exerciseId: string, request: UpdateTrainingExerciseRequest) {
    await exerciseApi.updateExercise(exerciseId, request);
    setExerciseExpanded(exerciseId, true);
    await reloadTrainingInPlace();
  }

  async function updateSet(setId: string, request: UpdateExerciseSetRequest) {
    await exerciseApi.updateSet(setId, request);
    await reloadTrainingInPlace();
  }

  async function deleteExercise(exercise: TrainingExercise) {
    if (!window.confirm(`Delete "${exercise.exerciseType.name}"? This removes all sets in this exercise.`)) return;

    setActionError(null);
    setDeletingExerciseId(exercise.id);
    try {
      await exerciseApi.deleteExercise(exercise.id);
      setExerciseExpanded(exercise.id, false);
      await reloadTrainingInPlace();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete exercise');
    } finally {
      setDeletingExerciseId(null);
    }
  }

  async function deleteSet(set: ExerciseSet) {
    if (!window.confirm(`Delete set ${set.repetitions} reps @ ${set.weight}kg?`)) return;

    setActionError(null);
    setDeletingSetId(set.id);
    try {
      await exerciseApi.deleteSet(set.id);
      await reloadTrainingInPlace();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete set');
    } finally {
      setDeletingSetId(null);
    }
  }

  async function reorderSets(orderedSets: ExerciseSet[]) {
    const updates = orderedSets.map((set, index) => ({ set, position: index + 1 }));
    const changed = updates.filter(({ set, position }) => set.position !== position);
    if (changed.length === 0) return;

    await Promise.all(
      changed.map(({ set }, index) =>
        exerciseApi.updateSet(set.id, {
          position: 100000 + index,
          repetitions: set.repetitions,
          weight: set.weight,
          rating: set.rating ?? null,
          note: set.note ?? null,
        })
      )
    );

    await Promise.all(
      updates.map(({ set, position }) =>
        exerciseApi.updateSet(set.id, {
          position,
          repetitions: set.repetitions,
          weight: set.weight,
          rating: set.rating ?? null,
          note: set.note ?? null,
        })
      )
    );

    await reloadTrainingInPlace();
  }

  if (trainingState.loading) {
    return <LoadingState label="Loading training" />;
  }

  if (trainingState.error && !training) {
    return <ErrorMessage message={trainingState.error ?? 'Training not found'} />;
  }

  if (!training) {
    return <ErrorMessage message="Training not found" />;
  }

  const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date(training.trainingDate));

  return (
    <div className="pb-24 sm:pb-8">
      <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-ink">
        <ArrowLeft size={17} aria-hidden="true" />
        Back
      </Link>

      <section className="mb-6 rounded-3xl border border-white bg-white/80 p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <TrainingThumbnail category={training.category} trainingDate={training.trainingDate} size="lg" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-mint-600">{date}</p>
              <h1 className="mt-2 truncate text-3xl font-black text-ink sm:text-4xl">{training.name || 'Untitled training'}</h1>
              {training.weight !== null && training.weight !== undefined && (
                <p className="mt-3 flex items-center gap-2 text-sm font-bold text-muted">
                  <Scale size={16} aria-hidden="true" />
                  {training.weight}kg
                </p>
              )}
            </div>
          </div>
          <Button className="hidden sm:inline-flex" onClick={() => setExerciseModalOpen(true)} icon={<Plus size={18} aria-hidden="true" />}>
            Add Exercise
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        {actionError && <ErrorMessage message={actionError} />}
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            expanded={expandedExerciseIds.has(exercise.id)}
            onAddSet={setSetTarget}
            onExpandedChange={setExerciseExpanded}
            onUpdate={updateExercise}
            onUpdateSet={updateSet}
            onReorderSets={reorderSets}
            onDeleteExercise={deleteExercise}
            onDeleteSet={deleteSet}
            deletingExerciseId={deletingExerciseId}
            deletingSetId={deletingSetId}
          />
        ))}
        {exercises.length === 0 && (
          <div className="rounded-3xl border border-dashed border-mint-200 bg-white/70 p-8 text-center shadow-card">
            <h2 className="text-xl font-bold text-ink">No exercises yet</h2>
            <p className="mt-2 text-sm text-muted">Add your first exercise, then record sets like 3 × 10 reps @ 60kg.</p>
            <Button className="mt-5" onClick={() => setExerciseModalOpen(true)} icon={<Plus size={18} aria-hidden="true" />}>
              Add Exercise
            </Button>
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={() => setExerciseModalOpen(true)}
        aria-label="Add Exercise"
        className="focus-ring fixed bottom-5 right-5 grid h-16 w-16 place-items-center rounded-full bg-mint-300 text-ink shadow-soft transition hover:bg-mint-400 sm:hidden"
      >
        <Plus size={28} aria-hidden="true" />
      </button>

      <Modal title="Add Exercise" open={exerciseModalOpen} onClose={() => setExerciseModalOpen(false)}>
        {formError && <div className="mb-4"><ErrorMessage message={formError} /></div>}
        {exerciseTypesState.loading && <LoadingState label="Loading exercise types" />}
        {exerciseTypesState.error && <ErrorMessage message={exerciseTypesState.error} />}
        {!exerciseTypesState.loading && !exerciseTypesState.error && (
          <AddExerciseForm
            exerciseTypes={exerciseTypesState.data ?? []}
            nextPosition={nextExercisePosition}
            onSubmit={addExercise}
            onCancel={() => setExerciseModalOpen(false)}
          />
        )}
      </Modal>

      <Modal title={`Add Sets${setTarget ? `: ${setTarget.exerciseType.name}` : ''}`} open={setTarget !== null} onClose={() => setSetTarget(null)}>
        {formError && <div className="mb-4"><ErrorMessage message={formError} /></div>}
        {setTarget && (
          <AddSetForm
            nextPosition={setTarget.sets.length + 1}
            onSubmit={addSet}
            onCancel={() => setSetTarget(null)}
          />
        )}
      </Modal>
    </div>
  );
}
