import type { TrainingCategory } from '../types/api';

type TrainingThumbnailProps = {
  category: TrainingCategory;
  trainingDate: string;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export const trainingCategories: Array<{ value: TrainingCategory; label: string }> = [
  { value: 'WHOLE_BODY', label: 'Whole body' },
  { value: 'LEGS', label: 'Legs' },
  { value: 'UPPER_BODY', label: 'Upper body' },
];

const monthColors = [
  '#3155B7',
  '#4B74D1',
  '#5797D6',
  '#42B4C5',
  '#1FA88A',
  '#C4A646',
  '#D63A32',
  '#C95B36',
  '#A8784F',
  '#798E91',
  '#4D73BE',
  '#1F55D6',
];

const sizeClass = {
  sm: 'h-14 w-14 rounded-2xl',
  md: 'h-20 w-20 rounded-3xl',
  lg: 'h-28 w-28 rounded-[1.75rem]',
};

export function trainingMonthColor(trainingDate: string) {
  const date = new Date(`${trainingDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return monthColors[0];
  return monthColors[date.getMonth()] ?? monthColors[0];
}

export function trainingCategoryLabel(category: TrainingCategory) {
  return trainingCategories.find((item) => item.value === category)?.label ?? 'Whole body';
}

export default function TrainingThumbnail({ category, selected = false, size = 'md', trainingDate }: TrainingThumbnailProps) {
  const color = trainingMonthColor(trainingDate);
  const trainingCategory = trainingCategories.some((item) => item.value === category) ? category : 'WHOLE_BODY';

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden border bg-white shadow-sm ${sizeClass[size]} ${
        selected ? 'border-mint-300 ring-4 ring-mint-200/80' : 'border-white/90'
      }`}
      style={{ color }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 160 160" className="h-full w-full" role="img">
        <defs>
          <radialGradient id={`training-orb-${trainingCategory}`} cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#6EE7C6" />
            <stop offset="48%" stopColor="currentColor" />
            <stop offset="100%" stopColor="#0B2F30" />
          </radialGradient>
          <filter id={`training-glow-${trainingCategory}`} x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="80" cy="80" r="66" fill="#fff" opacity=".88" />
        <circle cx="80" cy="80" r="56" fill={`url(#training-orb-${trainingCategory})`} />
        <circle cx="80" cy="80" r="45" fill="#0B2F30" opacity=".5" />
        <circle cx="80" cy="80" r="65" fill="none" stroke="#A1A7AA" strokeWidth="7" />
        <circle cx="80" cy="80" r="58" fill="none" stroke="#0B2F30" strokeWidth="3" />
        <circle cx="80" cy="80" r="49" fill="none" stroke="#6EE7C6" strokeWidth="2" opacity=".45" />
        <g filter={`url(#training-glow-${trainingCategory})`}>
          {trainingCategory === 'WHOLE_BODY' && (
          <>
            <circle cx="80" cy="45" r="10" fill="#DFF7F0" />
            <path d="M56 66c5-13 43-13 48 0l8 24c2 7-8 10-11 4l-5-13-4 48H68l-4-48-5 13c-3 6-13 3-11-4z" fill="#DFF7F0" />
            <path d="M66 76h28M72 130l-11 18M88 130l11 18M52 92l-13 18M108 92l13 18" stroke="#6EE7C6" strokeWidth="7" strokeLinecap="round" />
          </>
          )}
          {trainingCategory === 'LEGS' && (
          <>
            <circle cx="80" cy="40" r="9" fill="#DFF7F0" />
            <path d="M64 58h32l-7 41 26 30c5 6-5 14-11 7L75 102c-2-3-3-6-2-10l4-18h-8l-8 30-19 31c-5 8-16 1-11-7l17-29z" fill="#DFF7F0" />
            <path d="M67 78h24M42 132h22M104 133h25" stroke="#6EE7C6" strokeWidth="7" strokeLinecap="round" />
          </>
          )}
          {trainingCategory === 'UPPER_BODY' && (
          <>
            <circle cx="80" cy="45" r="10" fill="#DFF7F0" />
            <path d="M53 67c8-16 46-16 54 0l11 26c3 7-8 11-12 4l-7-14v45H61V83l-7 14c-4 7-15 3-12-4z" fill="#DFF7F0" />
            <path d="M33 72h27M100 72h27M40 57v30M120 57v30" stroke="#6EE7C6" strokeWidth="8" strokeLinecap="round" />
          </>
          )}
        </g>
      </svg>
    </span>
  );
}
