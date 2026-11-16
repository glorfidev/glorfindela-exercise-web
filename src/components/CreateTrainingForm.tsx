import { useState } from 'react';
import type { CreateTrainingRequest, TrainingCategory } from '../types/api';
import Button from './Button';
import { Input } from './Input';
import TrainingThumbnail, { trainingCategories } from './TrainingThumbnail';

type Props = {
  initialDate?: string;
  initialCategory?: TrainingCategory;
  initialName?: string;
  initialWeight?: number | null;
  onSubmit: (request: CreateTrainingRequest) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function CreateTrainingForm({
  initialCategory = 'WHOLE_BODY',
  initialDate = today(),
  initialName = '',
  initialWeight = null,
  onSubmit,
  onCancel,
  submitLabel = 'Create',
}: Props) {
  const [name, setName] = useState(initialName);
  const [trainingDate, setTrainingDate] = useState(initialDate);
  const [category, setCategory] = useState<TrainingCategory>(initialCategory);
  const [weight, setWeight] = useState(initialWeight === null || initialWeight === undefined ? '' : String(initialWeight));
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsedWeight = weight.trim() === '' ? null : Number(weight);
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim() || 'Training',
        trainingDate,
        category,
        weight: parsedWeight,
        note: null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset>
        <legend className="mb-3 text-sm font-bold text-ink">Training type</legend>
        <div className="grid grid-cols-3 gap-2">
          {trainingCategories.map((item) => {
            const selected = item.value === category;

            return (
              <label
                key={item.value}
                className={`focus-within:ring-mint-300/60 flex cursor-pointer flex-col items-center gap-2 rounded-3xl border p-2 text-center transition focus-within:ring-4 ${
                  selected ? 'border-mint-300 bg-mint-50 shadow-sm' : 'border-mint-100 bg-white hover:bg-mint-50/70'
                }`}
              >
                <input
                  type="radio"
                  name="trainingCategory"
                  value={item.value}
                  checked={selected}
                  onChange={() => setCategory(item.value)}
                  className="sr-only"
                />
                <TrainingThumbnail category={item.value} trainingDate={trainingDate} selected={selected} size="sm" />
                <span className="text-xs font-black text-ink">{item.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Upper body, legs, easy day" />
      <Input label="Date" type="date" required value={trainingDate} onChange={(event) => setTrainingDate(event.target.value)} />
      <Input
        label="Your weight (kg)"
        type="number"
        min="0"
        step="0.1"
        inputMode="decimal"
        value={weight}
        onStep={(value) => setWeight(String(value))}
        onChange={(event) => setWeight(event.target.value)}
        placeholder="Optional"
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
