import { ArrowRight, Clock3 } from 'lucide-react';
import { DAY_NAMES } from '../../lib/dates';
import { activityRange, getCategory, type NextInfo, type Segment } from '../../lib/schedule';
import { formatClock, formatDuration } from '../../lib/time';
import type { Category } from '../../types';
import { ProgressBar } from '../ui/ProgressBar';

function dayPhrase(daysAhead: number, day: number): string {
  if (daysAhead === 0) return 'at';
  if (daysAhead === 1) return 'tomorrow at';
  return `${DAY_NAMES[day]} at`;
}

interface NowCardProps {
  current: Segment | null;
  next: NextInfo | null;
  categories: Map<string, Category>;
  nowMinutes: number;
  use24h: boolean;
}

export function NowCard({ current, next, categories, nowMinutes, use24h }: NowCardProps) {
  const nextCategory = next ? getCategory(categories, next.segment.activity.categoryId) : null;
  const nextLine = next && (
    <p className="flex flex-wrap items-center gap-x-2 text-sm text-slate-600 dark:text-slate-400">
      <ArrowRight size={15} className="shrink-0" />
      <span>
        Next: <span className="font-medium text-slate-900 dark:text-slate-100">{next.segment.activity.name}</span>{' '}
        {dayPhrase(next.daysAhead, next.day)} {formatClock(next.segment.start, use24h)} · in{' '}
        {formatDuration(next.minutesUntil)}
      </span>
      {nextCategory && (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: nextCategory.color }} aria-hidden="true" />
      )}
    </p>
  );

  if (!current) {
    return (
      <section className="card p-5" aria-label="Current activity">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Clock3 size={14} /> Right now
        </div>
        <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Nothing scheduled</p>
        <div className="mt-2">{nextLine ?? <p className="text-sm text-slate-500">No upcoming activities.</p>}</div>
      </section>
    );
  }

  const category = getCategory(categories, current.activity.categoryId);
  const range = activityRange(current.activity);
  const total = range ? range.end - range.start : current.end - current.start;
  const elapsed = range ? (current.carryOver ? nowMinutes + 1440 - range.start : nowMinutes - range.start) : 0;
  const remaining = Math.max(0, total - elapsed);
  const pct = total > 0 ? (elapsed / total) * 100 : 0;

  return (
    <section
      className="card overflow-hidden p-5"
      style={{ backgroundImage: `linear-gradient(135deg, ${category.color}18, transparent 60%)` }}
      aria-label="Current activity"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: category.color }}>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: category.color }} />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
        </span>
        Happening now · {category.name}
      </div>
      <p className="mt-2 break-words text-xl font-semibold leading-snug text-slate-900 dark:text-white">
        {current.activity.name}
      </p>
      <div className="mt-4">
        <ProgressBar value={pct} color={category.color} label="Progress of current activity" />
        <div className="mt-2 flex items-center justify-between text-xs tabular-nums text-slate-500 dark:text-slate-400">
          <span>{formatDuration(elapsed)} done</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">{formatDuration(remaining)} left</span>
        </div>
      </div>
      <div className="mt-3 border-t border-slate-200/70 pt-3 dark:border-slate-800">{nextLine}</div>
    </section>
  );
}
