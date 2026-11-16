import { CalendarDays, Dumbbell, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ExerciseSetHistoryItem, ExerciseType } from '../types/api';
import { ExerciseTypePicture, slovakExerciseName } from './AddExerciseForm';
import ErrorMessage from './ErrorMessage';
import LoadingState from './LoadingState';

type ExerciseSetHistoryProps = {
  exerciseTypes: ExerciseType[];
  selectedExerciseTypeId: string;
  history: ExerciseSetHistoryItem[];
  loadingExerciseTypes: boolean;
  loadingHistory: boolean;
  exerciseTypesError: string | null;
  historyError: string | null;
  onSelectExerciseType: (exerciseTypeId: string) => void;
};

export default function ExerciseSetHistory({
  exerciseTypes,
  selectedExerciseTypeId,
  history,
  loadingExerciseTypes,
  loadingHistory,
  exerciseTypesError,
  historyError,
  onSelectExerciseType,
}: ExerciseSetHistoryProps) {
  return (
    <section className="mb-6 rounded-3xl border border-white bg-white/80 p-5 shadow-card sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(25rem,1fr)] lg:items-start">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-mint-600">Exercise history</p>
            <h2 className="mt-2 text-2xl font-black text-ink">Sets by exercise type</h2>
          </div>
          <ExerciseHistoryPicker
            exerciseTypes={exerciseTypes}
            selectedExerciseTypeId={selectedExerciseTypeId}
            disabled={loadingExerciseTypes || exerciseTypes.length === 0}
            onSelectExerciseType={onSelectExerciseType}
          />
        </div>

        <div className="lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto lg:pr-2 lg:pt-8">
          {exerciseTypesError && <ErrorMessage message={exerciseTypesError} />}
          {historyError && <ErrorMessage message={historyError} />}
          {(loadingExerciseTypes || loadingHistory) && <LoadingState label="Loading set history" />}
          {!loadingExerciseTypes && !loadingHistory && !exerciseTypesError && !historyError && (
            <HistoryRows history={history} />
          )}
        </div>
      </div>
    </section>
  );
}

type ExerciseHistoryPickerProps = {
  exerciseTypes: ExerciseType[];
  selectedExerciseTypeId: string;
  disabled: boolean;
  onSelectExerciseType: (exerciseTypeId: string) => void;
};

function ExerciseHistoryPicker({ exerciseTypes, selectedExerciseTypeId, disabled, onSelectExerciseType }: ExerciseHistoryPickerProps) {
  const [query, setQuery] = useState('');
  const suggestionPageSize = useSuggestionPageSize();
  const [visibleCount, setVisibleCount] = useState(suggestionPageSize);
  const sortedExerciseTypes = useMemo(
    () =>
      [...exerciseTypes].sort((a, b) => {
        const byTimesTrained = b.timesTrained - a.timesTrained;
        return byTimesTrained !== 0 ? byTimesTrained : a.name.localeCompare(b.name);
      }),
    [exerciseTypes]
  );
  const selectedExerciseType = sortedExerciseTypes.find((exerciseType) => exerciseType.id === selectedExerciseTypeId);

  const matchingExerciseTypes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery
      ? sortedExerciseTypes.filter((exerciseType) =>
          [exerciseType.name, exerciseType.category ?? '', exerciseType.code, slovakExerciseName(exerciseType)]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)
        )
      : selectedExerciseType
        ? [selectedExerciseType, ...sortedExerciseTypes.filter((exerciseType) => exerciseType.id !== selectedExerciseType.id)]
        : sortedExerciseTypes;
  }, [query, selectedExerciseType, sortedExerciseTypes]);

  const visibleExerciseTypes = matchingExerciseTypes.slice(0, visibleCount);
  const hasMoreExerciseTypes = visibleCount < matchingExerciseTypes.length;

  useEffect(() => {
    setVisibleCount(suggestionPageSize);
  }, [suggestionPageSize]);

  function selectExerciseType(exerciseTypeId: string) {
    onSelectExerciseType(exerciseTypeId);
    setQuery('');
    setVisibleCount(suggestionPageSize);
  }

  return (
    <div>
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-ink">Exercise type</span>
        <div className="focus-within:ring-mint-200/80 flex items-center gap-2 rounded-2xl border border-mint-100 bg-white px-4 py-3 text-base text-ink shadow-sm transition focus-within:ring-4 sm:text-sm">
          <Search size={16} className="shrink-0 text-muted" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(suggestionPageSize);
            }}
            placeholder={selectedExerciseType ? `${selectedExerciseType.name} · ${slovakExerciseName(selectedExerciseType)}` : 'Search exercise'}
            disabled={disabled}
            className="w-full bg-transparent text-base text-ink placeholder:text-muted/60 focus:outline-none disabled:cursor-not-allowed sm:text-sm"
          />
        </div>
      </label>

      <div className="mt-2 grid h-[min(24rem,48vh)] auto-rows-max gap-2 overflow-y-auto pr-1 sm:h-[22rem] sm:grid-cols-2 lg:h-[28rem] lg:grid-cols-1">
        {visibleExerciseTypes.map((exerciseType) => {
          const selected = exerciseType.id === selectedExerciseTypeId;

          return (
            <button
              key={exerciseType.id}
              type="button"
              onClick={() => selectExerciseType(exerciseType.id)}
              disabled={disabled}
              className={`focus-ring flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition disabled:cursor-not-allowed sm:px-4 ${
                selected ? 'bg-mint-300 text-ink shadow-sm' : 'bg-mint-50 text-ink hover:bg-mint-100'
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/70 text-muted/80 shadow-sm sm:size-14">
                  <ExerciseTypePicture type={exerciseType} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{exerciseType.name}</span>
                  <span className="block truncate text-xs font-medium text-muted">{slovakExerciseName(exerciseType)}</span>
                </span>
              </span>
              <span className="ml-auto shrink-0 text-xs font-bold text-muted">{exerciseType.category ?? exerciseType.code}</span>
            </button>
          );
        })}

        {exerciseTypes.length === 0 && <p className="rounded-2xl bg-mint-50 px-4 py-3 text-sm font-medium text-muted sm:col-span-2 lg:col-span-1">No exercise types.</p>}
        {matchingExerciseTypes.length === 0 && exerciseTypes.length > 0 && (
          <p className="rounded-2xl bg-mint-50 px-4 py-3 text-sm font-medium text-muted sm:col-span-2 lg:col-span-1">No exercise found.</p>
        )}
        {hasMoreExerciseTypes && (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + suggestionPageSize)}
            className="focus-ring w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-muted shadow-sm transition hover:bg-mint-50 hover:text-ink sm:col-span-2 lg:col-span-1"
          >
            Show more results
          </button>
        )}
      </div>
    </div>
  );
}

function useSuggestionPageSize() {
  const [isSmallScreen, setIsSmallScreen] = useState(() => (typeof window === 'undefined' ? false : !window.matchMedia('(min-width: 640px)').matches));

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 640px)');
    const update = () => setIsSmallScreen(!mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isSmallScreen ? 3 : 4;
}

function HistoryRows({ history }: { history: ExerciseSetHistoryItem[] }) {
  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-mint-200 bg-mint-50/70 px-4 py-5 text-sm font-medium text-muted">
        No sets recorded for this exercise type yet.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-mint-100 overflow-hidden rounded-2xl border border-mint-100 bg-white">
      {history.map((item) => {
        const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(item.training.trainingDate));
        return (
          <li key={item.set.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <Link to={`/trainings/${item.training.id}`} className="focus-ring rounded-xl text-sm font-bold text-ink transition hover:text-mint-600">
                {item.training.name || 'Untitled training'}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={13} aria-hidden="true" />
                  {date}
                </span>
                <span>Exercise #{item.exercisePosition}</span>
                <span>Set #{item.set.position}</span>
                {item.exerciseRating && <span>Exercise {item.exerciseRating}/3</span>}
                {item.set.rating && <span>Set {item.set.rating}/3</span>}
              </div>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-2xl bg-mint-50 px-3 py-2 text-sm font-black text-ink">
              <Dumbbell size={16} className="text-mint-600" aria-hidden="true" />
              {item.set.repetitions} reps @ {item.set.weight}kg
            </div>
          </li>
        );
      })}
    </ul>
  );
}
