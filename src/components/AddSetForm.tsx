import { useState } from 'react';
import type { CreateExerciseSetRequest } from '../types/api';
import Button from './Button';
import { Input } from './Input';

type Props = {
  nextPosition: number;
  onSubmit: (requests: CreateExerciseSetRequest[]) => Promise<void>;
  onCancel: () => void;
};

export default function AddSetForm({ nextPosition, onSubmit, onCancel }: Props) {
  const [setsToAdd, setSetsToAdd] = useState(3);
  const [repetitions, setRepetitions] = useState(10);
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const parsedWeight = parseWeight(weight);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (parsedWeight === null) return;

    setSaving(true);
    try {
      await onSubmit(
        Array.from({ length: setsToAdd }, (_, index) => ({
          position: nextPosition + index,
          repetitions,
          weight: parsedWeight,
          rating: null,
          note: null,
        }))
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-3xl bg-mint-50 p-4 text-center text-lg font-bold text-ink">
        {setsToAdd} × {repetitions} reps
        {parsedWeight !== null && ` @ ${parsedWeight}kg`}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Sets to add" type="number" min={1} required value={setsToAdd} onStep={setSetsToAdd} onChange={(event) => setSetsToAdd(Number(event.target.value))} />
        <Input label="Repetitions" type="number" min={1} required value={repetitions} onStep={setRepetitions} onChange={(event) => setRepetitions(Number(event.target.value))} />
        <Input
          label="Weight kg"
          type="text"
          inputMode="decimal"
          min={0}
          required
          value={weight}
          onStep={(value) => setWeight(String(value))}
          onChange={(event) => setWeight(event.target.value)}
          placeholder="Enter weight"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || parsedWeight === null}>
          {saving ? 'Saving' : `Add ${setsToAdd} ${setsToAdd === 1 ? 'Set' : 'Sets'}`}
        </Button>
      </div>
    </form>
  );
}

function parseWeight(value: string) {
  const normalizedValue = value.trim().replace(',', '.');
  if (!normalizedValue) return null;

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}
