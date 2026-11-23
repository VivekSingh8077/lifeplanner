import { ChevronLeft, ChevronRight, Copy, PencilLine, Plus, Trash2, Utensils } from 'lucide-react';
import { useState } from 'react';
import { FoodDatabase } from '../../components/health/FoodDatabase';
import { FoodEntryModal } from '../../components/health/FoodEntryModal';
import { HealthTabs } from '../../components/health/HealthTabs';
import { Disclaimer, MACRO_COLORS, SectionTitle } from '../../components/health/shared';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useToast } from '../../components/ui/Toast';
import { useHealth } from '../../hooks/useHealth';
import { MEAL_TYPES, round1 } from '../../lib/health';
import { addDays, formatDateLong, mealsOn, nutritionForEntries } from '../../lib/healthStats';
import { useApp } from '../../store/AppContext';
import type { MealEntry, MealType, Page } from '../../types';

export function FoodDiaryPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { actions } = useApp();
  const toast = useToast();
  const { health, today, targets } = useHealth();
  const [tab, setTab] = useState<'diary' | 'foods'>('diary');
  const [date, setDate] = useState(today);
  const [adding, setAdding] = useState<MealType | null>(null);
  const [editing, setEditing] = useState<MealEntry | null>(null);
  const [deleting, setDeleting] = useState<MealEntry | null>(null);

  const entries = mealsOn(health, date).sort((a, b) => a.time.localeCompare(b.time));
  const n = nutritionForEntries(entries);
  const isToday = date === today;

  const copyYesterday = () => {
    const prev = mealsOn(health, addDays(date, -1));
    prev.forEach(({ id: _id, ...rest }) => actions.addMeal({ ...rest, date }));
    toast.show(`Copied ${prev.length} entries from the previous day`);
  };
  const prevCount = mealsOn(health, addDays(date, -1)).length;

  return (
    <div className="space-y-5">
      <HealthTabs page="health-food" onNavigate={onNavigate} />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Food</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Log what you eat and manage your food list.</p>
        </div>
        <SegmentedControl label="Food section" value={tab} onChange={setTab} options={[{ value: 'diary', label: 'Diary' }, { value: 'foods', label: 'Foods' }]} />
      </header>

      {tab === 'foods' ? (
        <FoodDatabase />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-icon border border-slate-200 dark:border-slate-700" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{isToday ? 'Today' : formatDateLong(date)}</p>
              {isToday && <p className="text-xs text-slate-500">{formatDateLong(date)}</p>}
            </div>
            <input type="date" className="field !w-auto max-w-[9.5rem]" aria-label="Choose date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
            <button type="button" className="btn-icon border border-slate-200 disabled:opacity-40 dark:border-slate-700" aria-label="Next day" disabled={isToday} onClick={() => setDate(addDays(date, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>

          <section className="card space-y-3 p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Total</p>
              <p className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
                {n.calories} <span className="text-sm font-normal text-slate-500">{targets ? `/ ${targets.calories} kcal` : 'kcal'}</span>
              </p>
            </div>
            {targets && <ProgressBar value={(n.calories / targets.calories) * 100} color={n.calories > targets.calories ? '#f59e0b' : '#f97316'} label="Calories" />}
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              {([['Protein', n.protein, MACRO_COLORS.protein], ['Carbs', n.carbs, MACRO_COLORS.carbs], ['Fat', n.fat, MACRO_COLORS.fat]] as const).map(([l, v, c]) => (
                <div key={l} className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                  <p className="font-semibold tabular-nums" style={{ color: c }}>{round1(v)} g</p>
                  <p className="text-[11px] text-slate-500">{l}</p>
                </div>
              ))}
            </div>
          </section>

          {entries.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
              <Utensils className="text-slate-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No food logged for this day yet.</p>
              {prevCount > 0 && (
                <button type="button" className="btn btn-secondary" onClick={copyYesterday}>
                  <Copy size={16} /> Copy previous day ({prevCount})
                </button>
              )}
            </div>
          )}

          {MEAL_TYPES.map((m) => {
            const list = entries.filter((e) => e.meal === m.value);
            const kcal = list.reduce((s, e) => s + e.calories, 0);
            return (
              <section key={m.value} className="card overflow-hidden">
                <div className="px-4 pt-4">
                  <SectionTitle title={m.label} subtitle={list.length ? `${kcal} kcal` : undefined} action={
                    <button type="button" className="btn btn-secondary min-h-[40px] px-3 text-sm" onClick={() => setAdding(m.value)}>
                      <Plus size={16} /> Add
                    </button>
                  } />
                </div>
                {list.length === 0 ? (
                  <p className="px-4 pb-4 text-sm text-slate-400">Nothing logged</p>
                ) : (
                  <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                    {list.map((e) => (
                      <li key={e.id} className="flex items-center gap-1 py-1 pl-4 pr-1">
                        <div className="min-w-0 flex-1 py-1.5">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{e.name}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {e.servings} × {e.portion === 'custom' ? `${e.customGrams ?? ''} g` : e.portion} · {e.time} · P {e.protein} · C {e.carbs} · F {e.fat}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">{e.calories}</p>
                        <button type="button" className="btn-icon" aria-label={`Edit ${e.name}`} onClick={() => setEditing(e)}>
                          <PencilLine size={17} />
                        </button>
                        <button type="button" className="btn-icon hover:text-rose-600" aria-label={`Delete ${e.name}`} onClick={() => setDeleting(e)}>
                          <Trash2 size={17} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          <Disclaimer>Calories shown with a “~” are estimates for a typical serving; real values depend on the recipe and portion. Adjust the portion or edit a food if yours differs.</Disclaimer>
        </>
      )}

      {adding && <FoodEntryModal date={date} defaultMeal={adding} onClose={() => setAdding(null)} />}
      {editing && <FoodEntryModal initial={editing} date={editing.date} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          danger
          title="Delete this entry?"
          message={`Remove "${deleting.name}" (${deleting.calories} kcal) from your diary?`}
          confirmLabel="Delete"
          onConfirm={() => {
            actions.deleteMeal(deleting.id);
            toast.show('Entry deleted');
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
