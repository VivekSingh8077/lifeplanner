import { Trash2, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { EXERCISE_TYPES, estimateExerciseCalories } from '../../lib/health';
import { useApp } from '../../store/AppContext';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { FieldError } from './shared';

interface ExerciseModalProps {
  date: string;
  /** Used for the optional calorie estimate. */
  weightKg: number | null;
  onClose: () => void;
}

export function ExerciseModal({ date, weightKg, onClose }: ExerciseModalProps) {
  const { data, actions } = useApp();
  const toast = useToast();
  const [type, setType] = useState('Walking');
  const [minutes, setMinutes] = useState('30');
  const [calories, setCalories] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const min = Number(minutes);
  const cal = calories.trim() === '' ? null : Number(calories);
  const errors: { minutes?: string; calories?: string } = {};
  if (!Number.isFinite(min) || min < 1 || min > 600) errors.minutes = 'Enter a duration between 1 and 600 minutes.';
  if (cal !== null && (!Number.isFinite(cal) || cal < 0 || cal > 5000)) errors.calories = 'Enter calories between 0 and 5000, or leave blank.';
  const valid = Object.keys(errors).length === 0;

  const today = data.health.exerciseEntries.filter((e) => e.date === date);

  const estimate = () => {
    if (weightKg && Number.isFinite(min) && min > 0) setCalories(String(estimateExerciseCalories(type, min, weightKg)));
  };

  const save = () => {
    setSubmitted(true);
    if (!valid) return;
    actions.addExercise({ date, type, minutes: Math.round(min), caloriesBurned: cal === null ? null : Math.round(cal), note: note.trim() || undefined });
    toast.show('Exercise logged');
    setNote('');
    setCalories('');
    setSubmitted(false);
  };

  return (
    <Modal
      title="Log exercise"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="submit" form="exercise-form" className="btn btn-primary">
            Log exercise
          </button>
        </>
      }
    >
      <form
        id="exercise-form"
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <label className="field-label" htmlFor="ex-type">
            Activity
          </label>
          <select id="ex-type" className="field" value={type} onChange={(e) => setType(e.target.value)}>
            {EXERCISE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="ex-min">
            Duration (minutes)
          </label>
          <input id="ex-min" className="field" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/[^\d]/g, ''))} />
          {submitted && <FieldError message={errors.minutes} />}
        </div>
        <div>
          <label className="field-label" htmlFor="ex-cal">
            Calories burned (optional)
          </label>
          <div className="flex gap-2">
            <input
              id="ex-cal"
              className="field min-w-0 flex-1"
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="Leave blank if unknown"
            />
            <button type="button" className="btn btn-secondary px-3" onClick={estimate} disabled={!weightKg} title={weightKg ? 'Estimate from activity, duration and your weight' : 'Add your weight first'}>
              <Wand2 size={16} /> Estimate
            </button>
          </div>
          {submitted && <FieldError message={errors.calories} />}
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            The estimate uses a typical energy cost for the activity and your weight. It is only a rough guide and can be well off. Your food
            budget is not reduced by exercise unless you turn that on in Health Profile &amp; Settings.
          </p>
        </div>
        <div>
          <label className="field-label" htmlFor="ex-note">
            Note (optional)
          </label>
          <input id="ex-note" className="field" value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} />
        </div>
      </form>

      {today.length > 0 && (
        <div className="mt-5">
          <p className="field-label">Logged today</p>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
            {today.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-1 pl-4 pr-1">
                <span className="min-w-0 text-sm text-slate-700 dark:text-slate-200">
                  <span className="font-medium">{e.type}</span> · {e.minutes} min
                  {e.caloriesBurned !== null && <span className="text-slate-400"> · ~{e.caloriesBurned} kcal</span>}
                </span>
                <button type="button" className="btn-icon hover:text-rose-600" aria-label={`Remove ${e.type} entry`} onClick={() => actions.deleteExercise(e.id)}>
                  <Trash2 size={17} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
