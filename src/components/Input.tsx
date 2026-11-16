import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Minus, Plus } from 'lucide-react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  onStep?: (value: number) => void;
};

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

const stepButtonClassName = 'relative flex touch-manipulation items-center justify-center bg-white text-ink transition-colors active:bg-mint-200/40 focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mint-400 disabled:cursor-not-allowed disabled:opacity-30';

export function Input({ label, className = '', onStep, ...props }: InputProps) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const min = props.min === undefined ? -Infinity : Number(props.min);
  const max = props.max === undefined ? Infinity : Number(props.max);
  const step = Number(props.step ?? 1);
  const parsedValue = Number(String(props.value ?? '').trim().replace(',', '.'));
  const currentValue = Number.isFinite(parsedValue) ? parsedValue : Number.isFinite(min) ? min : 0;
  const stepDisabled = props.disabled || props.readOnly;

  function adjustValue(direction: number) {
    const increment = Number.isFinite(step) && step > 0 ? step : 1;
    const nextValue = Number((currentValue + direction * increment).toFixed(10));
    onStep?.(Math.min(max, Math.max(min, nextValue)));
  }

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-ink">{label}</label>
      <div className="relative">
        <input
          {...props}
          id={id}
          className={`focus-ring w-full rounded-2xl border border-mint-100 bg-white px-4 py-3 text-base text-ink shadow-sm transition placeholder:text-muted/60 sm:text-sm ${onStep ? 'min-h-16 pl-[4.25rem] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none' : ''} ${className}`}
        />
        {onStep && (
          <div className="absolute inset-y-px left-px grid w-14 grid-rows-2 overflow-hidden rounded-l-2xl border-r border-mint-100 [-webkit-tap-highlight-color:transparent]">
            <button
              type="button"
              aria-label={`Increase ${label.toLowerCase()}`}
              aria-controls={id}
              disabled={stepDisabled || currentValue >= max}
              onClick={() => adjustValue(1)}
              className={`${stepButtonClassName} border-b border-mint-100`}
            >
              <Plus size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Decrease ${label.toLowerCase()}`}
              aria-controls={id}
              disabled={stepDisabled || currentValue <= min}
              onClick={() => adjustValue(-1)}
              className={stepButtonClassName}
            >
              <Minus size={20} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TextArea({ label, className = '', ...props }: TextAreaProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <textarea
        className={`focus-ring min-h-24 w-full resize-y rounded-2xl border border-mint-100 bg-white px-4 py-3 text-base text-ink shadow-sm transition placeholder:text-muted/60 sm:text-sm ${className}`}
        {...props}
      />
    </label>
  );
}
