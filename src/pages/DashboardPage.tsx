import { CalendarOff, Pencil, Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NowCard } from '../components/dashboard/NowCard';
import { OverviewCards } from '../components/dashboard/OverviewCards';
import { WeeklyGrid } from '../components/dashboard/WeeklyGrid';
import { ActivityRow, type RowStatus } from '../components/schedule/ActivityRow';
import { DayTabs } from '../components/ui/DayTabs';
import { EmptyState } from '../components/ui/EmptyState';
import { ProgressBar } from '../components/ui/ProgressBar';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useNow } from '../hooks/useNow';
import { analyzeDay } from '../lib/analytics';
import { dateForDay, dayIdFromDate, DAY_NAMES, formatLongDate, greetingFor, toDateKey } from '../lib/dates';
import { activityRange, categoryMap, daySegments, findCurrent, findNext, getCategory } from '../lib/schedule';
import { formatClock, formatDuration, minutesOfDay } from '../lib/time';
import { useApp } from '../store/AppContext';
import type { DayId, Page } from '../types';

export function DashboardPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { data, actions } = useApp();
  const now = useNow();
  const today = dayIdFromDate(now);
  const nowMin = minutesOfDay(now);

  const [selected, setSelected] = useState<DayId | null>(null);
  const [view, setView] = useState<'daily' | 'weekly'>('daily');
  const day = selected ?? today;
  const isToday = day === today;

  const cats = useMemo(() => categoryMap(data.categories), [data.categories]);
  const stats = useMemo(() => analyzeDay(data.timetable, day, data.categories), [data, day]);
  const segments = useMemo(() => daySegments(data.timetable, day), [data.timetable, day]);

  const current = isToday ? findCurrent(data.timetable, today, nowMin) : null;
  const next = isToday ? findNext(data.timetable, today, nowMin) : null;

  // Completion is tracked per calendar date so each week starts fresh.
  const dateKey = toDateKey(dateForDay(day, now));
  const completedIds = useMemo(() => new Set(data.completions[dateKey] ?? []), [data.completions, dateKey]);
  const ownActivities = data.timetable[day].filter((a) => activityRange(a) !== null);
  const doneCount = ownActivities.filter((a) => completedIds.has(a.id)).length;
  const completionPct = ownActivities.length ? Math.round((doneCount / ownActivities.length) * 100) : 0;

  const statusFor = (start: number, end: number, isCurrent: boolean): RowStatus => {
    if (!isToday) return 'idle';
    if (isCurrent) return 'active';
    return nowMin >= end ? 'past' : start > nowMin ? 'upcoming' : 'idle';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{greetingFor(now)}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            MyLife Planner
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {formatLongDate(now)} ·{' '}
            <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">
              {formatClock(nowMin, data.use24h)}
            </span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button type="button" className="btn btn-primary" onClick={() => onNavigate('timetable')}>
            <Pencil size={16} /> Edit Timetable
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => onNavigate('settings')}>
            <Settings size={16} /> Settings
          </button>
        </div>
      </header>

      {/* Controls */}
      <div className="space-y-3">
        <DayTabs value={day} onChange={setSelected} today={today} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
            ]}
          />
          {view === 'daily' && !isToday && (
            <button type="button" className="btn btn-ghost min-h-[40px] px-3" onClick={() => setSelected(null)}>
              Back to today
            </button>
          )}
        </div>
      </div>

      {view === 'weekly' ? (
        <WeeklyGrid
          data={data}
          today={today}
          onPickDay={(d) => {
            setSelected(d);
            setView('daily');
          }}
        />
      ) : (
        <>
          {isToday && (
            <NowCard current={current} next={next} categories={cats} nowMinutes={nowMin} use24h={data.use24h} />
          )}

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
              {isToday ? 'Today' : DAY_NAMES[day]} at a glance
            </h2>
            <OverviewCards minutes={stats.byCategory} categories={data.categories} studyMinutes={stats.studyMinutes} />
          </div>

          <section aria-label="Schedule">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {isToday ? "Today's schedule" : `${DAY_NAMES[day]}'s schedule`}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {formatDuration(stats.studyMinutes)} study · {formatDuration(stats.productiveMinutes)} productive
                </p>
              </div>
              {ownActivities.length > 0 && (
                <div className="w-full sm:w-64">
                  <div className="mb-1 flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span>
                      {doneCount} of {ownActivities.length} completed
                    </span>
                    <span className="tabular-nums text-slate-800 dark:text-slate-200">{completionPct}%</span>
                  </div>
                  <ProgressBar value={completionPct} color="#10b981" label="Daily completion" />
                </div>
              )}
            </div>

            {segments.length === 0 ? (
              <EmptyState
                icon={<CalendarOff size={22} />}
                title={`Nothing planned for ${DAY_NAMES[day]}`}
                description="Add activities or copy another day's timetable to get started."
                action={
                  <button type="button" className="btn btn-primary" onClick={() => onNavigate('timetable')}>
                    <Pencil size={16} /> Edit timetable
                  </button>
                }
              />
            ) : (
              <ul className="space-y-2.5">
                {segments.map((seg) => {
                  const isCurrent =
                    current !== null && current.activity.id === seg.activity.id && current.carryOver === seg.carryOver;
                  return (
                    <ActivityRow
                      key={`${seg.activity.id}-${seg.carryOver ? 'carry' : 'own'}`}
                      segment={seg}
                      category={getCategory(cats, seg.activity.categoryId)}
                      status={statusFor(seg.start, seg.end, isCurrent)}
                      completed={!seg.carryOver && completedIds.has(seg.activity.id)}
                      use24h={data.use24h}
                      onToggle={seg.carryOver ? undefined : () => actions.toggleCompletion(dateKey, seg.activity.id)}
                    />
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
