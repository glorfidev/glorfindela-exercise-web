import type { SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
};

export default function Select({ label, children, className = '', ...props }: SelectProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <select
        className={`focus-ring w-full rounded-2xl border border-mint-100 bg-white px-4 py-3 text-base text-ink shadow-sm transition sm:text-sm ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
