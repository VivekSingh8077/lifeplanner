import type { DayId } from '../../types';
import { DAY_IDS, DAY_SHORT } from '../../lib/dates';

interface DayTabsProps {
  value: DayId;
  onChange: (day: DayId) => void;
  /** Highlights today's tab with a small dot. */
  today?: DayId;
}

/** Seven equal-width buttons so the control never needs horizontal scrolling. */
export function DayTabs({ value, onChange, today }: DayTabsProps) {
  return (
    <div className="grid grid-cols-7 gap-1.5" role="tablist" aria-label="Day of week">
      {DAY_IDS.map((d) => {
        const selected = d === value;
        return (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(d)}
            className={`relative flex min-h-[44px] items-center justify-center rounded-xl border text-xs font-semibold transition-colors sm:text-sm ${
              selected
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {DAY_SHORT[d]}
            {today === d && (
              <span
                className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${selected ? 'bg-white' : 'bg-indigo-500'}`}
                aria-label="today"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
