import { useState } from 'react';
import { round1, weightFromDisplay, weightToDisplay } from '../../lib/health';
import { formatDateLong } from '../../lib/healthStats';
import { useApp } from '../../store/AppContext';
import type { WeightEntry } from '../../types';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { FieldError } from './shared';

interface WeightFormModalProps {
  /** Entry being edited; omit to add a new one. */
  entry?: WeightEntry;
  today: string;
  unit: 'kg' | 'lb';
  onClose: () => void;
}

export function WeightFormModal({ entry, today, unit, onClose }: WeightFormModalProps) {
  const { data, actions } = useApp();
  const toast = useToast();
  const [date, setDate] = useState(entry?.date ?? today);
  const [value, setValue] = useState(entry ? String(weightToDisplay(entry.kg, unit)) : '');
  const [note, setNote] = useState(entry?.note ?? '');
  const [submitted, setSubmitted] = useState(false);

  const number = Number(value);
  const kg = weightFromDisplay(number, unit);
  const errors: { date?: string; value?: string } = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = 'Choose a date.';
  else if (date > today) errors.date = 'Pick today or an earlier date.';
  if (value.trim() === '' || !Number.isFinite(number)) errors.value = 'Enter your weight.';
  else if (kg < 30 || kg > 300) errors.value = `Enter a weight between ${round1(weightToDisplay(30, unit))} and ${round1(weightToDisplay(300, unit))} ${unit}.`;

  const existing = data.health.weightEntries.find((w) => w.date === date && w.id !== entry?.id);
  const valid = Object.keys(errors).length === 0;

  const save = () => {
    setSubmitted(true);
    if (!valid) return;
    actions.saveWeight({ id: entry?.id, date, kg: Math.round(kg * 100) / 100, note: note.trim() || undefined });
    toast.show(entry ? 'Weight entry updated' : 'Weight saved');
    onClose();
  };

  return (
    <Modal
      title={entry ? 'Edit weight entry' : 'Add weight'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="weight-form" className="btn btn-primary">
            {entry ? 'Save changes' : 'Save weight'}
          </button>
        </>
      }
    >
      <form
        id="weight-form"
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <label className="field-label" htmlFor="w-date">
            Measurement date
          </label>
          <input id="w-date" type="date" className="field" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          {submitted && <FieldError message={errors.date} />}
        </div>
        <div>
          <label className="field-label" htmlFor="w-value">
            Weight ({unit})
          </label>
          <input
            id="w-value"
            className="field text-lg font-semibold tabular-nums"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(',', '.'))}
            placeholder={unit === 'kg' ? 'e.g. 72.4' : 'e.g. 159.6'}
            autoFocus
          />
          {submitted && <FieldError message={errors.value} />}
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Tip: weigh at a similar time each day (for example after waking up) so readings are comparable.
          </p>
        </div>
        <div>
          <label className="field-label" htmlFor="w-note">
            Note (optional)
          </label>
          <input id="w-note" className="field" value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} placeholder="e.g. after a long trip" />
        </div>
        {existing && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            You already have an entry for {formatDateLong(date)} ({round1(weightToDisplay(existing.kg, unit))} {unit}). Saving will replace it.
          </p>
        )}
      </form>
    </Modal>
  );
}
