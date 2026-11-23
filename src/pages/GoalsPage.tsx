import { CheckCircle2, Minus, Pencil, Plus, RotateCcw, Target, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ProgressBar } from '../components/ui/ProgressBar';
import { formatWeekRange, weekKey } from '../lib/dates';
import { useApp } from '../store/AppContext';
import type { Goal } from '../types';

interface GoalFormProps {
  goal?: Goal;
  onClose: () => void;
}

function GoalForm({ goal, onClose }: GoalFormProps) {
  const { data, actions } = useApp();
  const [title, setTitle] = useState(goal?.title ?? '');
  const [target, setTarget] = useState(String(goal?.target ?? 3));
  const [unit, setUnit] = useState(goal?.unit ?? 'sessions');
  const [targetText, setTargetText] = useState(goal?.targetText ?? '');
  const [categoryId, setCategoryId] = useState(goal?.categoryId ?? '');

  const targetNumber = Number(target);
  const valid = title.trim().length > 0 && Number.isFinite(targetNumber) && targetNumber > 0;

  const save = () => {
    if (!valid) return;
    const values = {
      title: title.trim(),
      target: targetNumber,
      unit: unit.trim(),
      targetText: targetText.trim() || undefined,
      categoryId: categoryId || undefined,
    };
    if (goal) actions.updateGoal(goal.id, values);
    else actions.addGoal(values);
    onClose();
  };

  return (
    <Modal
      title={goal ? 'Edit goal' : 'Add goal'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="goal-form" className="btn btn-primary" disabled={!valid}>
            {goal ? 'Save changes' : 'Add goal'}
          </button>
        </>
      }
    >
      <form
        id="goal-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <label className="field-label" htmlFor="goal-title">
            Goal
          </label>
          <input id="goal-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor="goal-target">
              Weekly target
            </label>
            <input
              id="goal-target"
              className="field"
              type="number"
              inputMode="decimal"
              min={1}
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="goal-unit">
              Unit
            </label>
            <input id="goal-unit" className="field" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={20} placeholder="sessions" />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="goal-text">
            Target label (optional)
          </label>
          <input
            id="goal-text"
            className="field"
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
            maxLength={40}
            placeholder="e.g. 10–12 problems"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="goal-cat">
            Colour from category
          </label>
          <select id="goal-cat" className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">None</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}

export function GoalsPage() {
  const { data, actions } = useApp();
  const now = new Date();
  const week = weekKey(now);
  const progress = data.goalProgress[week] ?? {};
  const [dialog, setDialog] = useState<{ kind: 'add' } | { kind: 'edit'; goal: Goal } | { kind: 'delete'; goal: Goal } | { kind: 'reset' } | null>(null);

  const colorFor = (g: Goal) => data.categories.find((c) => c.id === g.categoryId)?.color ?? '#6366f1';
  const ratio = (g: Goal) => (g.target > 0 ? Math.min(1, (progress[g.id] ?? 0) / g.target) : 0);
  const overall = data.goals.length ? Math.round((data.goals.reduce((n, g) => n + ratio(g), 0) / data.goals.length) * 100) : 0;
  const completed = data.goals.filter((g) => ratio(g) >= 1).length;
  const close = () => setDialog(null);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Weekly goals</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Week of {formatWeekRange(now)}. Progress starts fresh every Monday.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => setDialog({ kind: 'reset' })}>
            <RotateCcw size={16} /> Reset week
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setDialog({ kind: 'add' })}>
            <Plus size={18} /> Add goal
          </button>
        </div>
      </header>

      {data.goals.length > 0 && (
        <section className="card p-4 sm:p-5" aria-label="Overall progress">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {completed} of {data.goals.length} goals reached
            </p>
            <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{overall}%</p>
          </div>
          <ProgressBar className="mt-2" value={overall} color="#10b981" label="Overall weekly progress" />
        </section>
      )}

      {data.goals.length === 0 ? (
        <EmptyState
          icon={<Target size={22} />}
          title="No goals yet"
          description="Add a weekly goal to start tracking your progress."
          action={
            <button type="button" className="btn btn-primary" onClick={() => setDialog({ kind: 'add' })}>
              <Plus size={16} /> Add goal
            </button>
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.goals.map((g) => {
            const value = progress[g.id] ?? 0;
            const color = colorFor(g);
            const done = ratio(g) >= 1;
            const set = (v: number) => actions.setProgress(week, g.id, v);
            return (
              <li key={g.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 break-words text-base font-semibold text-slate-900 dark:text-white">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      {g.title}
                      {done && <CheckCircle2 size={17} className="shrink-0 text-emerald-500" aria-label="Goal reached" />}
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      Target: {g.targetText ?? `${g.target} ${g.unit}`.trim()}
                    </p>
                  </div>
                  <div className="-mr-2 -mt-2 flex shrink-0">
                    <button type="button" className="btn-icon" aria-label={`Edit ${g.title}`} onClick={() => setDialog({ kind: 'edit', goal: g })}>
                      <Pencil size={17} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon hover:text-rose-600 dark:hover:text-rose-400"
                      aria-label={`Delete ${g.title}`}
                      onClick={() => setDialog({ kind: 'delete', goal: g })}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                      {value} <span className="font-normal text-slate-400">/ {g.target} {g.unit}</span>
                    </span>
                    <span className="text-xs font-medium tabular-nums text-slate-500">{Math.round(ratio(g) * 100)}%</span>
                  </div>
                  <ProgressBar value={ratio(g) * 100} color={done ? '#10b981' : color} label={`${g.title} progress`} />
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary w-11 px-0"
                    aria-label={`Decrease ${g.title} progress`}
                    onClick={() => set(Math.max(0, value - 1))}
                    disabled={value <= 0}
                  >
                    <Minus size={18} />
                  </button>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    className="field min-w-0 flex-1 text-center font-semibold tabular-nums"
                    aria-label={`${g.title} progress`}
                    value={value}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (e.target.value !== '' && Number.isFinite(n)) set(n);
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary w-11 px-0"
                    aria-label={`Increase ${g.title} progress`}
                    onClick={() => set(value + 1)}
                  >
                    <Plus size={18} />
                  </button>
                  {!done && (
                    <button type="button" className="btn btn-ghost px-3 text-xs" onClick={() => set(g.target)}>
                      Done
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dialog?.kind === 'add' && <GoalForm onClose={close} />}
      {dialog?.kind === 'edit' && <GoalForm goal={dialog.goal} onClose={close} />}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete goal?"
          message={`"${dialog.goal.title}" will be removed from your weekly goals.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => actions.deleteGoal(dialog.goal.id)}
          onCancel={close}
        />
      )}
      {dialog?.kind === 'reset' && (
        <ConfirmDialog
          title="Reset this week's progress?"
          message="All goal progress for the current week goes back to zero."
          confirmLabel="Reset progress"
          danger
          onConfirm={() => actions.resetWeekProgress(week)}
          onCancel={close}
        />
      )}
    </div>
  );
}
