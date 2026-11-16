import type { TrainingDetail } from '../types/api';

const TRAINING_CSV_HEADERS = [
  'training_id',
  'training_name',
  'training_date',
  'training_category',
  'training_weight',
  'exercise_id',
  'exercise_position',
  'exercise_type_code',
  'exercise_type_name',
  'exercise_note',
  'exercise_rating',
  'set_id',
  'set_position',
  'set_repetitions',
  'set_weight',
  'set_rating',
  'set_note',
];

function escapeCsvValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.includes('"') || text.includes(',') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildTrainingCsv(details: TrainingDetail[]) {
  const rows: Array<Array<string | number | null | undefined>> = [TRAINING_CSV_HEADERS];

  details.forEach((detail) => {
    const { training, exercises } = detail;
    if (exercises.length === 0) {
      rows.push([
        training.id,
        training.name,
        training.trainingDate,
        training.category,
        training.weight ?? '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ]);
      return;
    }

    exercises.forEach((exercise) => {
      if (exercise.sets.length === 0) {
        rows.push([
          training.id,
          training.name,
          training.trainingDate,
          training.category,
          training.weight ?? '',
          exercise.id,
          exercise.position,
          exercise.exerciseType.code,
          exercise.exerciseType.name,
          exercise.note ?? '',
          exercise.rating ?? '',
          '',
          '',
          '',
          '',
          '',
          '',
        ]);
        return;
      }

      exercise.sets.forEach((set) => {
        rows.push([
          training.id,
          training.name,
          training.trainingDate,
          training.category,
          training.weight ?? '',
          exercise.id,
          exercise.position,
          exercise.exerciseType.code,
          exercise.exerciseType.name,
          exercise.note ?? '',
          exercise.rating ?? '',
          set.id,
          set.position,
          set.repetitions,
          set.weight,
          set.rating ?? '',
          set.note ?? '',
        ]);
      });
    });
  });

  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

export function downloadCsv(csv: string, fileName: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function trainingCsvFileName(trainingDate: string, trainingName: string) {
  const safeName = slugify(trainingName) || 'training';
  return `${trainingDate}-${safeName}.csv`;
}
