import { Check, MoonStar } from 'lucide-react';
import { activityMinutes, crossesMidnight, type Segment } from '../../lib/schedule';
import { formatDuration, formatTimeString } from '../../lib/time';
import type { Category } from '../../types';
import { CategoryBadge } from '../ui/CategoryBadge';

export type RowStatus = 'active' | 'past' | 'upcoming' | 'idle';

interface ActivityRowProps {
  segment: Segment;
  category: Category;
  status: RowStatus;
  completed: boolean;
  use24h: boolean;
  /** Omitted for carry-over rows (they belong to yesterday's list). */
  onToggle?: () => void;
}

export function ActivityRow({ segment, category, status, completed, use24h, onToggle }: ActivityRowProps) {
  const { activity, carryOver } = segment;
  // Always show the activity's real start and end. For a carry-over row (the part of yesterday's
  // overnight activity) that means e.g. "11:30 PM – 6:30 AM", never a misleading "12:00 AM".
  const startLabel = formatTimeString(activity.start, use24h);
  const endLabel = formatTimeString(activity.end, use24h);
  const minutes = activityMinutes(activity);
  const nextDayEnd = crossesMidnight(activity);
  const remainingToday = carryOver ? segment.end - segment.start : null;

  const active = status === 'active';
  const dimmed = (status === 'past' && !completed) || (completed && !active);

  return (
    <li
      className={`relative flex items-stretch gap-3 rounded-2xl border p-3 pl-4 transition-colors ${
        active
          ? 'border-transparent shadow-card'
          : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900'
      } ${dimmed ? 'opacity-60' : ''}`}
      style={active ? { backgroundColor: `${category.color}14`, boxShadow: `inset 0 0 0 1.5px ${category.color}` } : undefined}
      aria-current={active ? 'true' : undefined}
    >
      <span
        className="absolute inset-y-3 left-0 w-1 rounded-r-full"
        style={{ backgroundColor: category.color }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">
          <span className="font-medium">
            {startLabel} – {endLabel}
            {nextDayEnd && !carryOver && <span className="ml-1 text-[10px] uppercase tracking-wide">+1 day</span>}
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatDuration(minutes)}</span>
        </div>
        <p
          className={`mt-0.5 break-words text-[15px] font-semibold leading-snug text-slate-900 dark:text-slate-100 ${
            completed ? 'line-through decoration-slate-400' : ''
          }`}
        >
          {activity.name}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <CategoryBadge category={category} />
          {active && (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white dark:bg-white dark:text-slate-900">
              Now
            </span>
          )}
          {status === 'upcoming' && !completed && (
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Upcoming</span>
          )}
          {carryOver && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <MoonStar size={12} /> from yesterday · {formatDuration(remainingToday ?? 0)} left today
            </span>
          )}
        </div>
      </div>
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={completed}
          aria-label={completed ? `Mark "${activity.name}" as not completed` : `Mark "${activity.name}" as completed`}
          className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-xl"
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
              completed
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-slate-300 text-transparent hover:border-emerald-500 dark:border-slate-600'
            }`}
          >
            <Check size={16} strokeWidth={3} />
          </span>
        </button>
      )}
    </li>
  );
}
