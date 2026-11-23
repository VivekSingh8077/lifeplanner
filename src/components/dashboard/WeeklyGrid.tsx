import { analyzeDay } from '../../lib/analytics';
import { DAY_IDS, DAY_NAMES } from '../../lib/dates';
import { daySegments, getCategory } from '../../lib/schedule';
import { formatDuration, formatTimeString } from '../../lib/time';
import type { AppData, DayId } from '../../types';
import { categoryMap } from '../../lib/schedule';

interface WeeklyGridProps {
  data: AppData;
  today: DayId;
  onPickDay: (day: DayId) => void;
}

/** Compact seven-day overview; cards stack on phones. */
export function WeeklyGrid({ data, today, onPickDay }: WeeklyGridProps) {
  const cats = categoryMap(data.categories);
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {DAY_IDS.map((day) => {
        const stats = analyzeDay(data.timetable, day, data.categories);
        const segs = daySegments(data.timetable, day);
        return (
          <section
            key={day}
            className={`card overflow-hidden ${today === day ? 'ring-2 ring-indigo-500/60' : ''}`}
            aria-label={DAY_NAMES[day]}
          >
            <button
              type="button"
              onClick={() => onPickDay(day)}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
            >
              <span className="font-semibold text-slate-900 dark:text-white">
                {DAY_NAMES[day]}
                {today === day && (
                  <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                    Today
                  </span>
                )}
              </span>
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {formatDuration(stats.studyMinutes)} study
              </span>
            </button>
            {segs.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Nothing planned</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {segs.map((s) => {
                  const cat = getCategory(cats, s.activity.categoryId);
                  return (
                    <li key={`${s.activity.id}-${s.carryOver ? 'c' : 'o'}`} className="flex items-center gap-3 px-4 py-2">
                      <span className="h-6 w-1 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} aria-hidden="true" />
                      <span className="w-[4.5rem] shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {s.carryOver ? `→ ${formatTimeString(s.activity.end, data.use24h)}` : formatTimeString(s.activity.start, data.use24h)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-200">
                        {s.activity.name}
                        {s.carryOver && <span className="text-slate-400"> (cont.)</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
