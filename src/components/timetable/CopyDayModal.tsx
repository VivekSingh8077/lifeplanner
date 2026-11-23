import { useState } from 'react';
import { DAY_IDS, DAY_NAMES, DAY_SHORT } from '../../lib/dates';
import { useApp } from '../../store/AppContext';
import type { DayId } from '../../types';
import { Modal } from '../ui/Modal';

interface CopyDayModalProps {
  /** Day currently being edited – preselected as a target. */
  day: DayId;
  onClose: () => void;
}

export function CopyDayModal({ day, onClose }: CopyDayModalProps) {
  const { data, actions } = useApp();
  const [from, setFrom] = useState<DayId>(day === 0 ? 1 : 0);
  const [targets, setTargets] = useState<DayId[]>([day === from ? (day === 0 ? 1 : 0) : day]);

  const effectiveTargets = targets.filter((d) => d !== from);
  const overwriting = effectiveTargets.filter((d) => data.timetable[d].length > 0);

  const toggle = (d: DayId) =>
    setTargets((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]) as DayId[]);

  const copy = () => {
    if (!effectiveTargets.length) return;
    actions.copyDay(from, effectiveTargets);
    onClose();
  };

  return (
    <Modal
      title="Copy a day's timetable"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!effectiveTargets.length} onClick={copy}>
            Copy to {effectiveTargets.length || '…'} {effectiveTargets.length === 1 ? 'day' : 'days'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="field-label" htmlFor="copy-from">
            Copy from
          </label>
          <select id="copy-from" className="field" value={from} onChange={(e) => setFrom(Number(e.target.value) as DayId)}>
            {DAY_IDS.map((d) => (
              <option key={d} value={d}>
                {DAY_NAMES[d]} ({data.timetable[d].length} activities)
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="field-label">Copy to</span>
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_IDS.map((d) => {
              const disabled = d === from;
              const on = !disabled && targets.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  disabled={disabled}
                  aria-pressed={on}
                  title={DAY_NAMES[d]}
                  onClick={() => toggle(d)}
                  className={`chip px-0 disabled:opacity-30 ${on ? 'chip-on' : 'chip-off'}`}
                >
                  {DAY_SHORT[d]}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              onClick={() => setTargets(DAY_IDS.filter((d) => d !== from && d <= 4))}
            >
              Weekdays
            </button>
            <button
              type="button"
              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              onClick={() => setTargets(DAY_IDS.filter((d) => d !== from))}
            >
              All other days
            </button>
          </div>
        </div>
        {overwriting.length > 0 && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            This replaces the existing timetable for {overwriting.map((d) => DAY_NAMES[d]).join(', ')}.
          </p>
        )}
      </div>
    </Modal>
  );
}
