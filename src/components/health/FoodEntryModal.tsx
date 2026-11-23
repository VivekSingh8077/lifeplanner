import { ArrowLeft, PencilLine, Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MEAL_TYPES, PORTION_FACTORS, portionFactor, scaleNutrition } from '../../lib/health';
import { useApp } from '../../store/AppContext';
import type { FoodItem, MealEntry, MealType, PortionSize } from '../../types';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { FieldError, MACRO_COLORS } from './shared';

interface Base {
  foodId: string | null;
  name: string;
  servingLabel: string;
  servingGrams: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  approximate: boolean;
}

const baseFromFood = (f: FoodItem): Base => ({
  foodId: f.id,
  name: f.name,
  servingLabel: f.servingLabel,
  servingGrams: f.servingGrams,
  calories: f.calories,
  protein: f.protein,
  carbs: f.carbs,
  fat: f.fat,
  approximate: f.approximate,
});

/** Rebuild the per-serving values an existing entry was logged with (so editing never changes history silently). */
function baseFromEntry(e: MealEntry, foods: FoodItem[]): Base {
  const food = e.foodId ? foods.find((f) => f.id === e.foodId) : undefined;
  const factor = portionFactor({ servingGrams: food?.servingGrams ?? null }, e.portion, e.customGrams) * e.servings || 1;
  const per = (n: number) => Math.round((n / factor) * 100) / 100;
  return {
    foodId: e.foodId,
    name: e.name,
    servingLabel: e.servingLabel,
    servingGrams: food?.servingGrams ?? null,
    calories: per(e.calories),
    protein: per(e.protein),
    carbs: per(e.carbs),
    fat: per(e.fat),
    approximate: food?.approximate ?? true,
  };
}

const MANUAL_BASE: Base = {
  foodId: null,
  name: '',
  servingLabel: '1 serving',
  servingGrams: null,
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  approximate: false,
};

function nowTime(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

interface FoodEntryModalProps {
  /** Entry being edited; omit to log a new food. */
  initial?: MealEntry;
  defaultMeal?: MealType;
  date: string;
  onClose: () => void;
}

export function FoodEntryModal({ initial, defaultMeal = 'breakfast', date, onClose }: FoodEntryModalProps) {
  const { data, actions } = useApp();
  const toast = useToast();
  const foods = data.health.foods;

  const [step, setStep] = useState<'pick' | 'details'>(initial ? 'details' : 'pick');
  const [base, setBase] = useState<Base>(() => (initial ? baseFromEntry(initial, foods) : MANUAL_BASE));
  const [editBase, setEditBase] = useState(false);
  const [saveAsFood, setSaveAsFood] = useState(false);

  const [meal, setMeal] = useState<MealType>(initial?.meal ?? defaultMeal);
  const [entryDate, setEntryDate] = useState(initial?.date ?? date);
  const [time, setTime] = useState(initial?.time ?? nowTime());
  const [portion, setPortion] = useState<PortionSize>(initial?.portion ?? 'medium');
  const [customGrams, setCustomGrams] = useState(initial?.customGrams ? String(initial.customGrams) : '');
  const [servings, setServings] = useState(initial ? String(initial.servings) : '1');
  const [submitted, setSubmitted] = useState(false);

  // ---- picker state ----
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'meal' | 'favorites' | 'recent' | 'all'>('meal');

  const recentIds = useMemo(() => {
    const seen: string[] = [];
    for (const e of [...data.health.mealEntries].sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))) {
      if (e.foodId && !seen.includes(e.foodId)) seen.push(e.foodId);
      if (seen.length >= 12) break;
    }
    return seen;
  }, [data.health.mealEntries]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = foods;
    if (q) list = list.filter((f) => f.name.toLowerCase().includes(q));
    else if (filter === 'meal') list = list.filter((f) => f.meals.includes(meal) || f.meals.length === 0);
    else if (filter === 'favorites') list = list.filter((f) => f.favorite);
    else if (filter === 'recent') list = recentIds.map((id) => foods.find((f) => f.id === id)).filter((f): f is FoodItem => !!f);
    const sorted = filter === 'recent' && !q ? list : [...list].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
    return sorted;
  }, [foods, query, filter, meal, recentIds]);

  // ---- details calculations ----
  const servingsNum = Number(servings);
  const gramsNum = customGrams.trim() === '' ? null : Number(customGrams);
  const totals = scaleNutrition(base, portion, gramsNum, Number.isFinite(servingsNum) ? servingsNum : 0);

  const errors: Record<string, string> = {};
  if (!base.name.trim()) errors.name = 'Give the food a name.';
  if (!Number.isFinite(servingsNum) || servingsNum <= 0 || servingsNum > 50) errors.servings = 'Enter a number of servings between 0.1 and 50.';
  if (portion === 'custom') {
    if (!base.servingGrams) errors.grams = 'Set the serving weight (open “Edit nutrition”) to use a custom weight.';
    else if (gramsNum === null || !Number.isFinite(gramsNum) || gramsNum < 1 || gramsNum > 5000) errors.grams = 'Enter the weight of your serving in grams (1 to 5000).';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) errors.date = 'Choose a date.';
  if (!/^\d{1,2}:\d{2}$/.test(time)) errors.time = 'Choose a time.';
  for (const k of ['calories', 'protein', 'carbs', 'fat'] as const) {
    if (!Number.isFinite(base[k]) || base[k] < 0 || base[k] > 5000) errors[k] = 'Enter a value between 0 and 5000.';
  }
  const valid = Object.keys(errors).length === 0;

  const choose = (f: FoodItem) => {
    setBase(baseFromFood(f));
    setEditBase(false);
    setPortion('medium');
    setCustomGrams('');
    setServings('1');
    setStep('details');
  };

  const manual = () => {
    setBase(MANUAL_BASE);
    setEditBase(true);
    setSaveAsFood(true);
    setStep('details');
  };

  const setNum = (key: 'calories' | 'protein' | 'carbs' | 'fat') => (v: string) => setBase((b) => ({ ...b, [key]: v.trim() === '' ? 0 : Number(v.replace(',', '.')) }));

  const save = () => {
    setSubmitted(true);
    if (!valid) return;
    const entry = {
      date: entryDate,
      time: time.padStart(5, '0'),
      meal,
      foodId: base.foodId,
      name: base.name.trim(),
      servingLabel: base.servingLabel,
      servings: servingsNum,
      portion,
      customGrams: portion === 'custom' ? gramsNum : null,
      ...totals,
    };
    if (initial) {
      actions.updateMeal(initial.id, entry);
      toast.show('Food entry updated');
    } else {
      if (saveAsFood && !base.foodId) {
        actions.addFood({
          name: base.name.trim(),
          servingLabel: base.servingLabel,
          servingGrams: base.servingGrams,
          calories: Math.round(base.calories),
          protein: base.protein,
          carbs: base.carbs,
          fat: base.fat,
          approximate: base.approximate,
          favorite: false,
          meals: [meal],
        });
      }
      actions.addMeal(entry);
      toast.show(`Logged ${entry.name} · ${entry.calories} kcal`);
    }
    onClose();
  };

  /* ------------------------------ render ------------------------------ */

  if (step === 'pick') {
    return (
      <Modal title="Log food" onClose={onClose} wide>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label" htmlFor="fe-meal">
                Meal
              </label>
              <select id="fe-meal" className="field" value={meal} onChange={(e) => setMeal(e.target.value as MealType)}>
                {MEAL_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button type="button" className="btn btn-secondary w-full" onClick={manual}>
                <PencilLine size={16} /> Enter manually
              </button>
            </div>
          </div>

          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="field pl-10"
              placeholder="Search foods (e.g. poha, rajma, samosa)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search foods"
              autoFocus
            />
          </div>

          {!query.trim() && (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Food list">
              {(
                [
                  ['meal', 'For this meal'],
                  ['favorites', 'Favourites'],
                  ['recent', 'Recent'],
                  ['all', 'All foods'],
                ] as const
              ).map(([key, label]) => (
                <button key={key} type="button" role="radio" aria-checked={filter === key} onClick={() => setFilter(key)} className={`chip ${filter === key ? 'chip-on' : 'chip-off'}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
              {query.trim() ? (
                <>
                  No foods match “{query.trim()}”.{' '}
                  <button type="button" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400" onClick={manual}>
                    Enter it manually
                  </button>
                </>
              ) : filter === 'favorites' ? (
                'No favourites yet. Tap the star next to a food to keep it here.'
              ) : filter === 'recent' ? (
                'Foods you log will show up here.'
              ) : (
                'No foods in this list.'
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {results.slice(0, 80).map((f) => (
                <li key={f.id} className="flex items-center">
                  <button type="button" className="flex min-h-[56px] min-w-0 flex-1 flex-col justify-center px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60" onClick={() => choose(f)}>
                    <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{f.name}</span>
                    <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {f.servingLabel} · {f.approximate ? '~' : ''}
                      {f.calories} kcal · P {f.protein} g
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn-icon shrink-0"
                    aria-label={f.favorite ? `Remove ${f.name} from favourites` : `Add ${f.name} to favourites`}
                    aria-pressed={f.favorite}
                    onClick={() => actions.updateFood(f.id, { favorite: !f.favorite })}
                  >
                    <Star size={18} className={f.favorite ? 'fill-amber-400 text-amber-500' : ''} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {results.length > 80 && <p className="text-center text-xs text-slate-400">Showing the first 80. Type to narrow the list.</p>}
        </div>
      </Modal>
    );
  }

  const approxNote = base.approximate || base.foodId?.startsWith('starter-');

  return (
    <Modal
      title={initial ? 'Edit food entry' : 'Log food'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="entry-form" className="btn btn-primary">
            {initial ? 'Save changes' : `Log ${totals.calories} kcal`}
          </button>
        </>
      }
    >
      <form
        id="entry-form"
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {editBase && !base.foodId ? (
              <>
                <label className="field-label" htmlFor="fe-name">
                  Food name
                </label>
                <input id="fe-name" className="field" value={base.name} maxLength={80} onChange={(e) => setBase((b) => ({ ...b, name: e.target.value }))} autoFocus />
                {submitted && <FieldError message={errors.name} />}
              </>
            ) : (
              <>
                <p className="break-words text-base font-semibold text-slate-900 dark:text-white">{base.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">One serving: {base.servingLabel}</p>
              </>
            )}
          </div>
          {!initial && (
            <button type="button" className="btn btn-ghost min-h-[40px] shrink-0 px-3 text-xs" onClick={() => setStep('pick')}>
              <ArrowLeft size={15} /> Change
            </button>
          )}
        </div>

        {/* Portion */}
        <div>
          <span className="field-label">Portion size</span>
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Portion size">
            {(['small', 'medium', 'large', 'custom'] as const).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={portion === p} onClick={() => setPortion(p)} className={`chip flex-col gap-0 px-1 capitalize ${portion === p ? 'chip-on' : 'chip-off'}`}>
                {p}
                {p !== 'custom' && <span className="text-[10px] font-normal opacity-80">×{PORTION_FACTORS[p]}</span>}
              </button>
            ))}
          </div>
          {portion === 'custom' && (
            <div className="mt-2">
              <label className="field-label" htmlFor="fe-grams">
                Weight of one serving (g){base.servingGrams ? ` — standard serving is ~${base.servingGrams} g` : ''}
              </label>
              <input id="fe-grams" className="field" inputMode="decimal" value={customGrams} onChange={(e) => setCustomGrams(e.target.value.replace(',', '.'))} />
              {submitted && <FieldError message={errors.grams} />}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor="fe-servings">
              Number of servings
            </label>
            <input id="fe-servings" className="field" inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value.replace(',', '.'))} />
            {submitted && <FieldError message={errors.servings} />}
          </div>
          <div>
            <label className="field-label" htmlFor="fe-meal2">
              Meal
            </label>
            <select id="fe-meal2" className="field" value={meal} onChange={(e) => setMeal(e.target.value as MealType)}>
              {MEAL_TYPES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="fe-date">
              Date
            </label>
            <input id="fe-date" type="date" className="field" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            {submitted && <FieldError message={errors.date} />}
          </div>
          <div>
            <label className="field-label" htmlFor="fe-time">
              Time
            </label>
            <input id="fe-time" type="time" className="field" value={time} onChange={(e) => setTime(e.target.value)} />
            {submitted && <FieldError message={errors.time} />}
          </div>
        </div>

        {/* Live totals */}
        <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800/70" aria-live="polite">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">This entry{approxNote ? ' (approximate)' : ''}</p>
            <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
              {approxNote ? '~' : ''}
              {totals.calories} <span className="text-sm font-normal text-slate-500">kcal</span>
            </p>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
            {(
              [
                ['Protein', totals.protein, MACRO_COLORS.protein],
                ['Carbs', totals.carbs, MACRO_COLORS.carbs],
                ['Fat', totals.fat, MACRO_COLORS.fat],
              ] as const
            ).map(([label, v, c]) => (
              <div key={label} className="rounded-xl bg-white p-2 dark:bg-slate-900">
                <p className="font-semibold tabular-nums" style={{ color: c }}>
                  {v} g
                </p>
                <p className="text-[11px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
          {approxNote && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Estimated for a typical serving. Real calories depend on the recipe, oil and portion, so adjust the portion or edit the nutrition
              if yours differs.
            </p>
          )}
        </div>

        {/* Edit nutrition */}
        <div>
          {!(editBase && !base.foodId && !initial && saveAsFood && base.name === '' && false) && (
            <button type="button" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => setEditBase((v) => !v)} aria-expanded={editBase}>
              {editBase ? 'Hide nutrition editor' : 'Edit nutrition for one serving'}
            </button>
          )}
          {editBase && (
            <div className="mt-3 space-y-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label" htmlFor="eb-serving">
                    One serving is
                  </label>
                  <input id="eb-serving" className="field" value={base.servingLabel} maxLength={50} onChange={(e) => setBase((b) => ({ ...b, servingLabel: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label" htmlFor="eb-grams">
                    Serving weight (g)
                  </label>
                  <input
                    id="eb-grams"
                    className="field"
                    inputMode="decimal"
                    placeholder="optional"
                    value={base.servingGrams ?? ''}
                    onChange={(e) => setBase((b) => ({ ...b, servingGrams: e.target.value.trim() === '' ? null : Number(e.target.value.replace(',', '.')) }))}
                  />
                </div>
                {(
                  [
                    ['calories', 'Calories (kcal)'],
                    ['protein', 'Protein (g)'],
                    ['carbs', 'Carbs (g)'],
                    ['fat', 'Fat (g)'],
                  ] as const
                ).map(([k, label]) => (
                  <div key={k}>
                    <label className="field-label" htmlFor={`eb-${k}`}>
                      {label}
                    </label>
                    <input id={`eb-${k}`} className="field" inputMode="decimal" value={base[k] === 0 ? '' : base[k]} placeholder="0" onChange={(e) => setNum(k)(e.target.value)} />
                    {submitted && <FieldError message={errors[k]} />}
                  </div>
                ))}
              </div>
              {!initial && !base.foodId && (
                <label className="flex min-h-[44px] items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <input type="checkbox" className="h-5 w-5 rounded accent-indigo-600" checked={saveAsFood} onChange={(e) => setSaveAsFood(e.target.checked)} />
                  Also save to my food list
                </label>
              )}
              {base.foodId && <p className="text-xs text-slate-500">Changes here apply to this entry only. To change the food itself, edit it in the Foods tab.</p>}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
