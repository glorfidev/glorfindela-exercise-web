import { expect, it, vi } from 'vitest';
import { exercise, exerciseSet, training, trainingDetail } from '../test/fixtures';
import { buildTrainingCsv, downloadCsv, trainingCsvFileName } from './trainingCsv';

it('exports an empty collection as a header-only CSV', () => {
  const csv = buildTrainingCsv([]);
  expect(csv.split('\n')).toHaveLength(1);
  expect(csv.split(',')).toHaveLength(17);
  expect(csv).toContain('set_repetitions,set_weight,set_rating,set_note');
});

it('exports one row per set and preserves zero values', () => {
  const detail = trainingDetail({ exercises: [exercise({ sets: [exerciseSet(), exerciseSet({ id: 'set-2', position: 2, weight: 0 })] })] });
  expect(buildTrainingCsv([detail]).split('\n').slice(1)).toEqual([
    'training-1,Morning workout,2026-01-10,UPPER_BODY,75,exercise-1,1,BENCH_PRESS,Bench Press,,,set-1,1,10,50,,',
    'training-1,Morning workout,2026-01-10,UPPER_BODY,75,exercise-1,1,BENCH_PRESS,Bench Press,,,set-2,2,10,0,,',
  ]);
});

it('retains workouts and exercises that have no sets', () => {
  const csv = buildTrainingCsv([
    trainingDetail({ training: training({ weight: null }), exercises: [] }),
    trainingDetail({ exercises: [exercise({ sets: [], note: 'Slow', rating: 2 })] }),
  ]);
  const rows = csv.split('\n').slice(1).map((row) => row.split(','));
  expect(rows.map((row) => row.length)).toEqual([17, 17]);
  expect(rows[0].slice(4)).toEqual(Array(13).fill(''));
  expect(rows[1].slice(9, 12)).toEqual(['Slow', '2', '']);
});

it('escapes commas, quotation marks and line breaks', () => {
  const csv = buildTrainingCsv([trainingDetail({
    training: training({ name: 'Legs, "heavy"' }),
    exercises: [exercise({ note: 'Line one\nLine two', sets: [exerciseSet({ note: 'A\rB' })] })],
  })]);
  expect(csv).toContain('"Legs, ""heavy"""');
  expect(csv).toContain('"Line one\nLine two"');
  expect(csv).toContain('"A\rB"');
});

it.each([
  ['  Upper Body! ', '2026-01-10-upper-body.csv'],
  ['', '2026-01-10-training.csv'],
  ['!!!', '2026-01-10-training.csv'],
])('creates a safe filename for %j', (name, expected) => {
  expect(trainingCsvFileName('2026-01-10', name)).toBe(expected);
});

it('downloads CSV and releases the temporary URL and link', () => {
  const createObjectURL = vi.fn((_blob: Blob) => 'blob:test-csv');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = createObjectURL;
    static revokeObjectURL = revokeObjectURL;
  });
  let clickedLink: HTMLAnchorElement | undefined;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clickedLink = this; });
  downloadCsv('header\nvalue', 'workouts.csv');
  expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  expect(createObjectURL.mock.calls[0][0].type).toBe('text/csv;charset=utf-8;');
  expect(clickedLink?.download).toBe('workouts.csv');
  expect(clickedLink?.href).toBe('blob:test-csv');
  expect(clickedLink?.isConnected).toBe(false);
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-csv');
});
