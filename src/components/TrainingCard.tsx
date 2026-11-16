import { CalendarDays, ChevronRight, Copy, Scale, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Training } from '../types/api';
import TrainingThumbnail from './TrainingThumbnail';

type TrainingCardProps = {
  training: Training;
  copying?: boolean;
  deleting?: boolean;
  onCopy: (training: Training) => void;
  onDelete: (training: Training) => void;
};

export default function TrainingCard({ copying = false, deleting = false, onCopy, onDelete, training }: TrainingCardProps) {
  const title = training.name || 'Untitled training';
  const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(training.trainingDate));
  const busy = copying || deleting;

  return (
    <article className="group rounded-3xl border border-white bg-white/85 p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <Link to={`/trainings/${training.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <TrainingThumbnail category={training.category} trainingDate={training.trainingDate} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-lg font-bold text-ink">{title}</span>
            <span className="mt-2 flex items-center gap-2 text-sm font-semibold text-muted">
              <CalendarDays size={16} aria-hidden="true" />
              {date}
            </span>
            {training.weight !== null && training.weight !== undefined && (
              <span className="mt-2 flex items-center gap-2 text-sm font-semibold text-muted">
                <Scale size={16} aria-hidden="true" />
                {training.weight}kg
              </span>
            )}
            {training.note && <span className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{training.note}</span>}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onCopy(training)}
            disabled={busy}
            aria-label={`Copy ${title}`}
            className="focus-ring grid h-10 w-10 place-items-center rounded-2xl bg-white text-muted shadow-sm transition hover:bg-mint-50 hover:text-mint-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Copy size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(training)}
            disabled={busy}
            aria-label={`Delete ${title}`}
            className="focus-ring grid h-10 w-10 place-items-center rounded-2xl bg-white text-muted shadow-sm transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 size={17} aria-hidden="true" />
          </button>
          <Link
            to={`/trainings/${training.id}`}
            aria-label={`Open ${title}`}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-mint-100 text-mint-600 transition group-hover:bg-mint-200"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
