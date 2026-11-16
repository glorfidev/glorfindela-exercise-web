import { Clock3, ListChecks, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exerciseApi } from '../api/client';
import Button from '../components/Button';
import CreateTrainingForm from '../components/CreateTrainingForm';
import ErrorMessage from '../components/ErrorMessage';
import ExerciseSetHistory from '../components/ExerciseSetHistory';
import LoadingState from '../components/LoadingState';
import Modal from '../components/Modal';
import TrainingCard from '../components/TrainingCard';
import { useAsync } from '../hooks/useAsync';
import type { CreateTrainingRequest, Training } from '../types/api';

type DashboardView = 'trainings' | 'history';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: trainings, error, loading, reload } = useAsync(exerciseApi.listTrainings, []);
  const exerciseTypesState = useAsync(exerciseApi.listExerciseTypes, []);
  const [selectedExerciseTypeId, setSelectedExerciseTypeId] = useState('');
  const setHistoryState = useAsync(
    () => (selectedExerciseTypeId ? exerciseApi.listExerciseSetHistory(selectedExerciseTypeId) : Promise.resolve([])),
    [selectedExerciseTypeId]
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [copyTarget, setCopyTarget] = useState<Training | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copyFormError, setCopyFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingTrainingId, setDeletingTrainingId] = useState<string | null>(null);
  const [copyingTrainingId, setCopyingTrainingId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<DashboardView>('trainings');

  useEffect(() => {
    const exerciseTypes = exerciseTypesState.data ?? [];
    if (exerciseTypes.length === 0) {
      setSelectedExerciseTypeId('');
      return;
    }

    if (!selectedExerciseTypeId || !exerciseTypes.some((exerciseType) => exerciseType.id === selectedExerciseTypeId)) {
      setSelectedExerciseTypeId(exerciseTypes[0].id);
    }
  }, [exerciseTypesState.data, selectedExerciseTypeId]);

  async function createTraining(request: CreateTrainingRequest) {
    setFormError(null);
    try {
      const created = await exerciseApi.createTraining(request);
      setModalOpen(false);
      await reload();
      navigate(`/trainings/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create training');
    }
  }

  async function deleteTraining(training: Training) {
    const title = training.name || 'Untitled training';
    if (!window.confirm(`Delete "${title}"? This removes all exercises and sets in this training.`)) return;

    setDeleteError(null);
    setDeletingTrainingId(training.id);
    try {
      await exerciseApi.deleteTraining(training.id);
      await reload();
      await setHistoryState.reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete training');
    } finally {
      setDeletingTrainingId(null);
    }
  }

  function openCopyModal(training: Training) {
    setCopyFormError(null);
    setCopyTarget(training);
  }

  async function copyTraining(request: CreateTrainingRequest) {
    if (!copyTarget) return;
    setCopyFormError(null);
    setCopyingTrainingId(copyTarget.id);
    try {
      const created = await exerciseApi.copyTraining(copyTarget.id, {
        name: request.name,
        trainingDate: request.trainingDate,
        category: request.category,
        weight: request.weight ?? null,
      });
      setCopyTarget(null);
      await reload();
      navigate(`/trainings/${created.id}`);
    } catch (err) {
      setCopyFormError(err instanceof Error ? err.message : 'Could not copy training');
    } finally {
      setCopyingTrainingId(null);
    }
  }

  return (
    <div className="pb-24 sm:pb-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <img src="/brand/glorfex-horizontal.png" alt="Glorfex Training Tracker" className="h-auto w-full max-w-xs object-contain sm:max-w-sm" />
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Track gym days, exercises, grouped sets, and ratings in one simple flow.
          </p>
          <DashboardMenu activeView={activeView} onChange={setActiveView} />
        </div>
        {activeView === 'trainings' && (
          <Button className="hidden sm:inline-flex" onClick={() => setModalOpen(true)} icon={<Plus size={18} aria-hidden="true" />}>
            New Training
          </Button>
        )}
      </section>

      {error && <ErrorMessage message={error} />}
      {deleteError && <div className="mb-4"><ErrorMessage message={deleteError} /></div>}
      {loading && <LoadingState label="Loading trainings" />}

      {!loading && !error && (
        <>
          {activeView === 'history' && (
            <ExerciseSetHistory
              exerciseTypes={exerciseTypesState.data ?? []}
              selectedExerciseTypeId={selectedExerciseTypeId}
              history={setHistoryState.data ?? []}
              loadingExerciseTypes={exerciseTypesState.loading}
              loadingHistory={setHistoryState.loading}
              exerciseTypesError={exerciseTypesState.error}
              historyError={setHistoryState.error}
              onSelectExerciseType={setSelectedExerciseTypeId}
            />
          )}

          {activeView === 'trainings' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(trainings ?? []).map((training) => (
                <TrainingCard
                  key={training.id}
                  training={training}
                  copying={copyingTrainingId === training.id}
                  deleting={deletingTrainingId === training.id}
                  onCopy={openCopyModal}
                  onDelete={deleteTraining}
                />
              ))}
              {(trainings ?? []).length === 0 && (
                <div className="rounded-3xl border border-dashed border-mint-200 bg-white/70 p-8 text-center shadow-card sm:col-span-2 lg:col-span-3">
                  <h2 className="text-xl font-bold text-ink">No trainings yet</h2>
                  <p className="mt-2 text-sm text-muted">Create your first session and add exercises with grouped sets.</p>
                  <Button className="mt-5" onClick={() => setModalOpen(true)} icon={<Plus size={18} aria-hidden="true" />}>
                    New Training
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeView === 'trainings' && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label="New Training"
          className="focus-ring fixed bottom-5 right-5 grid h-16 w-16 place-items-center rounded-full bg-mint-300 text-ink shadow-soft transition hover:bg-mint-400 sm:hidden"
        >
          <Plus size={28} aria-hidden="true" />
        </button>
      )}

      <Modal title="New Training" open={modalOpen} onClose={() => setModalOpen(false)}>
        {formError && <div className="mb-4"><ErrorMessage message={formError} /></div>}
        <CreateTrainingForm onSubmit={createTraining} onCancel={() => setModalOpen(false)} />
      </Modal>

      <Modal title="Copy Training" open={copyTarget !== null} onClose={() => setCopyTarget(null)}>
        {copyFormError && <div className="mb-4"><ErrorMessage message={copyFormError} /></div>}
        {copyTarget && (
          <CreateTrainingForm
            key={copyTarget.id}
            initialName={`${copyTarget.name + ' copy' || 'Untitled training'}`}
            initialCategory={copyTarget.category}
            initialWeight={copyTarget.weight ?? null}
            onSubmit={copyTraining}
            onCancel={() => setCopyTarget(null)}
            submitLabel="Copy"
          />
        )}
      </Modal>
    </div>
  );
}

function DashboardMenu({ activeView, onChange }: { activeView: DashboardView; onChange: (view: DashboardView) => void }) {
  const items: Array<{ view: DashboardView; label: string; icon: React.ReactNode }> = [
    { view: 'trainings', label: 'Trainings', icon: <ListChecks size={16} aria-hidden="true" /> },
    { view: 'history', label: 'Exercise history', icon: <Clock3 size={16} aria-hidden="true" /> },
  ];

  return (
    <div className="mt-5 inline-grid w-full grid-cols-2 rounded-2xl bg-white p-1 shadow-sm sm:w-auto">
      {items.map((item) => {
        const selected = item.view === activeView;

        return (
          <button
            key={item.view}
            type="button"
            onClick={() => onChange(item.view)}
            className={`focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              selected ? 'bg-mint-300 text-ink shadow-sm' : 'text-muted hover:bg-mint-50 hover:text-ink'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
