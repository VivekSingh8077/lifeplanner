import { CalendarPlus, Copy, Pencil, Plus, RotateCcw, Tags, Trash2, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ActivityForm } from '../components/timetable/ActivityForm';
import { CategoryManager } from '../components/timetable/CategoryManager';
import { CopyDayModal } from '../components/timetable/CopyDayModal';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DayTabs } from '../components/ui/DayTabs';
import { EmptyState } from '../components/ui/EmptyState';
import { dayIdFromDate, DAY_NAMES } from '../lib/dates';
import { activityMinutes, categoryMap, crossesMidnight, findConflicts, getCategory, sortedActivities } from '../lib/schedule';
import { analyzeDay } from '../lib/analytics';
import { formatDuration, formatTimeString } from '../lib/time';
import { useApp } from '../store/AppContext';
import type { Activity, DayId } from '../types';

type Dialog =
  | { kind: 'add' }
  | { kind: 'edit'; activity: Activity }
  | { kind: 'delete'; activity: Activity }
  | { kind: 'copy' }
  | { kind: 'categories' }
  | { kind: 'clearDay' }
  | { kind: 'resetDay' }
  | { kind: 'resetAll' };

export function TimetablePage() {
  const { data, actions } = useApp();
  const [day, setDay] = useState<DayId>(() => dayIdFromDate(new Date()));
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const cats = useMemo(() => categoryMap(data.categories), [data.categories]);
  const activities = useMemo(() => sortedActivities(data.timetable[day]), [data.timetable, day]);
  const conflicts = useMemo(() => findConflicts(data.timetable, [day]), [data.timetable, day]);
  const stats = useMemo(() => analyzeDay(data.timetable, day, data.categories), [data, day]);
  const close = () => setDialog(null);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Timetable</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Each day has its own schedule. Changes are saved automatically and show up everywhere instantly.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDialog({ kind: 'add' })}>
          <Plus size={18} /> Add activity
        </button>
      </header>

      <DayTabs value={day} onChange={setDay} today={dayIdFromDate(new Date())} />

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary min-h-[44px]" onClick={() => setDialog({ kind: 'copy' })}>
          <Copy size={16} /> Copy a day
        </button>
        <button type="button" className="btn btn-secondary min-h-[44px]" onClick={() => setDialog({ kind: 'categories' })}>
          <Tags size={16} /> Categories
        </button>
        <button type="button" className="btn btn-secondary min-h-[44px]" onClick={() => setDialog({ kind: 'resetDay' })}>
          <RotateCcw size={16} /> Reset {DAY_NAMES[day].slice(0, 3)}
        </button>
        <button
          type="button"
          className="btn btn-secondary min-h-[44px]"
          onClick={() => setDialog({ kind: 'clearDay' })}
          disabled={activities.length === 0}
        >
          <Trash2 size={16} /> Clear day
        </button>
      </div>

      <section aria-label={`${DAY_NAMES[day]} activities`}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{DAY_NAMES[day]}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {activities.length} {activities.length === 1 ? 'activity' : 'activities'} · {formatDuration(stats.scheduledMinutes)}{' '}
            scheduled · {formatDuration(stats.studyMinutes)} study
          </p>
        </div>

        {conflicts.size > 0 && (
          <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-amber-300/70 bg-amber-50 p-3.5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <TriangleAlert size={17} className="mt-0.5 shrink-0" />
            <p>
              Some activities overlap (highlighted below). Overlapping minutes are counted once in analytics, by whichever
              activity starts first.
            </p>
          </div>
        )}

        {activities.length === 0 ? (
          <EmptyState
            icon={<CalendarPlus size={22} />}
            title={`No activities on ${DAY_NAMES[day]}`}
            description="Add your first activity, copy another day, or restore the default schedule."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" className="btn btn-primary" onClick={() => setDialog({ kind: 'add' })}>
                  <Plus size={16} /> Add activity
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setDialog({ kind: 'copy' })}>
                  <Copy size={16} /> Copy a day
                </button>
              </div>
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {activities.map((a) => {
              const cat = getCategory(cats, a.categoryId);
              const invalid = activityMinutes(a) === 0;
              const overlapping = conflicts.has(a.id);
              return (
                <li
                  key={a.id}
                  className={`card relative flex items-center gap-2 p-3 pl-4 ${
                    overlapping || invalid ? 'border-amber-400/70 dark:border-amber-500/50' : ''
                  }`}
                >
                  <span className="absolute inset-y-3 left-0 w-1 rounded-r-full" style={{ backgroundColor: cat.color }} aria-hidden="true" />
                  <button
                    type="button"
                    className="min-w-0 flex-1 rounded-xl py-1 text-left"
                    onClick={() => setDialog({ kind: 'edit', activity: a })}
                    aria-label={`Edit ${a.name}`}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      <span className="font-medium">
                        {formatTimeString(a.start, data.use24h)} – {formatTimeString(a.end, data.use24h)}
                        {crossesMidnight(a) && <span className="ml-1 text-[10px] uppercase">+1 day</span>}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDuration(activityMinutes(a))}</span>
                      {overlapping && (
                        <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                          <TriangleAlert size={12} /> Overlaps
                        </span>
                      )}
                      {invalid && (
                        <span className="inline-flex items-center gap-1 font-medium text-rose-600">
                          <TriangleAlert size={12} /> Invalid time
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 break-words text-[15px] font-semibold leading-snug text-slate-900 dark:text-slate-100">
                      {a.name}
                    </p>
                    <div className="mt-1.5">
                      <CategoryBadge category={cat} />
                    </div>
                  </button>
                  <div className="flex shrink-0 flex-col sm:flex-row">
                    <button type="button" className="btn-icon" aria-label={`Edit ${a.name}`} onClick={() => setDialog({ kind: 'edit', activity: a })}>
                      <Pencil size={18} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon hover:text-rose-600 dark:hover:text-rose-400"
                      aria-label={`Delete ${a.name}`}
                      onClick={() => setDialog({ kind: 'delete', activity: a })}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Start over</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Restore the original Monday–Sunday timetable for all days. Your categories, goals and progress are kept.
          </p>
        </div>
        <button type="button" className="btn btn-secondary shrink-0" onClick={() => setDialog({ kind: 'resetAll' })}>
          <RotateCcw size={16} /> Reset full timetable
        </button>
      </section>

      {dialog?.kind === 'add' && <ActivityForm day={day} onClose={close} />}
      {dialog?.kind === 'edit' && <ActivityForm day={day} activity={dialog.activity} onClose={close} />}
      {dialog?.kind === 'copy' && <CopyDayModal day={day} onClose={close} />}
      {dialog?.kind === 'categories' && <CategoryManager onClose={close} />}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete activity?"
          message={`"${dialog.activity.name}" will be removed from ${DAY_NAMES[day]}.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => actions.deleteActivity(day, dialog.activity.id)}
          onCancel={close}
        />
      )}
      {dialog?.kind === 'clearDay' && (
        <ConfirmDialog
          title={`Clear ${DAY_NAMES[day]}?`}
          message={`All ${activities.length} activities on ${DAY_NAMES[day]} will be removed.`}
          confirmLabel="Clear day"
          danger
          onConfirm={() => actions.clearDay(day)}
          onCancel={close}
        />
      )}
      {dialog?.kind === 'resetDay' && (
        <ConfirmDialog
          title={`Reset ${DAY_NAMES[day]}?`}
          message={`${DAY_NAMES[day]} will go back to the original default schedule. Your edits for this day will be lost.`}
          confirmLabel="Reset day"
          danger
          onConfirm={() => actions.resetDay(day)}
          onCancel={close}
        />
      )}
      {dialog?.kind === 'resetAll' && (
        <ConfirmDialog
          title="Reset the whole timetable?"
          message="All seven days will return to the original default schedule. Any changes you made to activities will be lost."
          confirmLabel="Reset timetable"
          danger
          onConfirm={() => actions.resetTimetable()}
          onCancel={close}
        />
      )}
    </div>
  );
}
