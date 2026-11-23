import type { ReactNode } from 'react';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  label: string;
}

export function SegmentedControl<T extends string>({ value, options, onChange, label }: SegmentedControlProps<T>) {
  return (
    <div
      className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
      role="radiogroup"
      aria-label={label}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
              selected
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
