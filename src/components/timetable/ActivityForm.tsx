import { TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DAY_IDS, DAY_NAMES, DAY_SHORT } from '../../lib/dates';
import { activityMinutes, conflictsForCandidate, crossesMidnight, validateActivity } from '../../lib/schedule';
import { formatDuration, formatTimeString } from '../../lib/time';
import { useApp } from '../../store/AppContext';
import type { Activity, DayId } from '../../types';
import { Modal } from '../ui/Modal';

interface ActivityFormProps {
  day: DayId;
  /** When set the form edits this activity; otherwise it adds a new one. */
  activity?: Activity;
  onClose: () => void;
}

export function ActivityForm({ day, activity, onClose }: ActivityFormProps) {
  const { data, actions } = useApp();
  const editing = !!activity;

  const [name, setName] = useState(activity?.name ?? '');
  const [categoryId, setCategoryId] = useState(activity?.categoryId ?? data.categories[0]?.id ?? '');
  const [start, setStart] = useState(activity?.start ?? '09:00');
  const [end, setEnd] = useState(activity?.end ?? '10:00');
  const [days, setDays] = useState<DayId[]>([day]);
  const [submitted, setSubmitted] = useState(false);

  const draft = { name, categoryId, start, end };
  const errors = useMemo(() => validateActivity(draft, data.categories), [name, categoryId, start, end, data.categories]); // eslint-disable-line react-hooks/exhaustive-deps
  const minutes = activityMinutes(draft);

  // Overlap warnings (non-blocking) for every day this will be saved to.
  const overlaps = useMemo(() => {
    if (errors.length) return [];
    const candidate: Activity = { id: activity?.id ?? '__new__', ...draft };
    const targetDays = editing ? [day] : days;
    return targetDays.flatMap((d) =>
      conflictsForCandidate(data.timetable, d, candidate).map((a) => ({ day: d, activity: a })),
    );
  }, [errors, name, categoryId, start, end, days, day, editing, activity?.id, data.timetable]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDay = (d: DayId) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()) as DayId[]);

  const canSave = errors.length === 0 && (editing || days.length > 0);

  const save = () => {
    setSubmitted(true);
    if (!canSave) return;
    const values = { name: name.trim(), categoryId, start, end };
    if (activity) actions.updateActivity(day, activity.id, values);
    else actions.addActivity(days, values);
    onClose();
  };

  return (
    <Modal
      title={editing ? 'Edit activity' : 'Add activity'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="activity-form" className="btn btn-primary" disabled={submitted && !canSave}>
            {editing ? 'Save changes' : 'Add activity'}
          </button>
        </>
      }
    >
      <form
        id="activity-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        noValidate
      >
        <div>
          <label className="field-label" htmlFor="act-name">
            Activity name
          </label>
          <input
            id="act-name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. DSA practice"
            maxLength={80}
            autoFocus
          />
        </div>

        <div>
          <label className="field-label" htmlFor="act-cat">
            Category
          </label>
          <select id="act-cat" className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {!data.categories.some((c) => c.id === categoryId) && <option value={categoryId}>Uncategorised</option>}
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor="act-start">
              Start time
            </label>
            <input id="act-start" type="time" className="field" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="act-end">
              End time
            </label>
            <input id="act-end" type="time" className="field" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        {errors.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatTimeString(start, data.use24h)} → {formatTimeString(end, data.use24h)} ·{' '}
            <span className="font-medium text-slate-800 dark:text-slate-200">{formatDuration(minutes)}</span>
            {crossesMidnight(draft) && ' (continues past midnight)'}
          </p>
        )}

        {!editing && (
          <div>
            <span className="field-label">Add to</span>
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_IDS.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days.includes(d)}
                  title={DAY_NAMES[d]}
                  onClick={() => toggleDay(d)}
                  className={`chip px-0 ${days.includes(d) ? 'chip-on' : 'chip-off'}`}
                >
                  {DAY_SHORT[d]}
                </button>
              ))}
            </div>
            {days.length === 0 && <p className="mt-1.5 text-xs text-rose-600">Pick at least one day.</p>}
          </div>
        )}

        {submitted && errors.length > 0 && (
          <ul className="space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        {overlaps.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/70 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <TriangleAlert size={17} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Overlaps with existing activities</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {overlaps.slice(0, 5).map(({ day: d, activity: a }) => (
                  <li key={`${d}-${a.id}`}>
                    {!editing && days.length > 1 ? `${DAY_SHORT[d]}: ` : ''}
                    {a.name} ({formatTimeString(a.start, data.use24h)}–{formatTimeString(a.end, data.use24h)})
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs opacity-80">You can still save. Overlapping time is only counted once in analytics.</p>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
