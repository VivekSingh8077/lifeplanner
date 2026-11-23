import { useState } from 'react';
import { MEAL_TYPES } from '../../lib/health';
import { useApp } from '../../store/AppContext';
import type { FoodItem, MealType } from '../../types';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { FieldError } from './shared';

interface FoodFormModalProps {
  /** Food being edited (starter or custom); omit to create a custom food. */
  food?: FoodItem;
  onClose: () => void;
}

const numStr = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

function parse(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export function FoodFormModal({ food, onClose }: FoodFormModalProps) {
  const { actions } = useApp();
  const toast = useToast();
  const [name, setName] = useState(food?.name ?? '');
  const [servingLabel, setServingLabel] = useState(food?.servingLabel ?? '1 serving');
  const [grams, setGrams] = useState(numStr(food?.servingGrams));
  const [calories, setCalories] = useState(numStr(food?.calories));
  const [protein, setProtein] = useState(numStr(food?.protein));
  const [carbs, setCarbs] = useState(numStr(food?.carbs));
  const [fat, setFat] = useState(numStr(food?.fat));
  const [meals, setMeals] = useState<MealType[]>(food?.meals ?? []);
  const [favorite, setFavorite] = useState(food?.favorite ?? false);
  const [approximate, setApproximate] = useState(food?.approximate ?? false);
  const [submitted, setSubmitted] = useState(false);

  const g = parse(grams);
  const cal = parse(calories);
  const pro = parse(protein);
  const car = parse(carbs);
  const fa = parse(fat);

  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = 'Give the food a name.';
  if (!servingLabel.trim()) errors.servingLabel = 'Describe one serving, e.g. "1 katori".';
  if (g !== null && (Number.isNaN(g) || g < 1 || g > 5000)) errors.grams = 'Enter 1 to 5000 g, or leave blank.';
  if (cal === null || Number.isNaN(cal) || cal < 0 || cal > 5000) errors.calories = 'Enter calories (0 to 5000).';
  for (const [key, v] of [['protein', pro], ['carbs', car], ['fat', fa]] as const) {
    if (v !== null && (Number.isNaN(v) || v < 0 || v > 500)) errors[key] = 'Enter 0 to 500 g, or leave blank.';
  }
  const valid = Object.keys(errors).length === 0;

  const save = () => {
    setSubmitted(true);
    if (!valid || cal === null) return;
    const values = {
      name: name.trim(),
      servingLabel: servingLabel.trim(),
      servingGrams: g,
      calories: Math.round(cal),
      protein: pro ?? 0,
      carbs: car ?? 0,
      fat: fa ?? 0,
      meals,
      favorite,
      approximate,
    };
    if (food) {
      actions.updateFood(food.id, values);
      toast.show('Food updated');
    } else {
      actions.addFood({ ...values, note: undefined });
      toast.show('Custom food added');
    }
    onClose();
  };

  const toggleMeal = (m: MealType) => setMeals((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const macro = (id: string, label: string, value: string, set: (v: string) => void, error?: string) => (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="field" inputMode="decimal" value={value} onChange={(e) => set(e.target.value.replace(',', '.'))} />
      {submitted && <FieldError message={error} />}
    </div>
  );

  return (
    <Modal
      title={food ? `Edit ${food.source === 'starter' ? 'food' : 'custom food'}` : 'Add custom food'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="food-form" className="btn btn-primary">
            {food ? 'Save changes' : 'Add food'}
          </button>
        </>
      }
    >
      <form
        id="food-form"
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {food?.source === 'starter' && (
          <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            This is a starter item from the hostel mess menu. Its values are approximate estimates; adjust them to match what you actually
            eat. You can restore the original values later.
          </p>
        )}
        <div>
          <label className="field-label" htmlFor="f-name">
            Food name
          </label>
          <input id="f-name" className="field" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus />
          {submitted && <FieldError message={errors.name} />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor="f-serving">
              One serving is
            </label>
            <input id="f-serving" className="field" value={servingLabel} maxLength={50} onChange={(e) => setServingLabel(e.target.value)} placeholder="1 katori" />
            {submitted && <FieldError message={errors.servingLabel} />}
          </div>
          <div>
            <label className="field-label" htmlFor="f-grams">
              Serving weight (g)
            </label>
            <input id="f-grams" className="field" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value.replace(',', '.'))} placeholder="optional" />
            {submitted && <FieldError message={errors.grams} />}
          </div>
        </div>

        <fieldset>
          <legend className="field-label">Nutrition per serving</legend>
          <div className="grid grid-cols-2 gap-3">
            {macro('f-cal', 'Calories (kcal)', calories, setCalories, errors.calories)}
            {macro('f-pro', 'Protein (g)', protein, setProtein, errors.protein)}
            {macro('f-carb', 'Carbs (g)', carbs, setCarbs, errors.carbs)}
            {macro('f-fat', 'Fat (g)', fat, setFat, errors.fat)}
          </div>
        </fieldset>

        <div>
          <span className="field-label">Usually eaten at</span>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={meals.includes(m.value)}
                onClick={() => toggleMeal(m.value)}
                className={`chip ${meals.includes(m.value) ? 'chip-on' : 'chip-off'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex min-h-[44px] items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" className="h-5 w-5 rounded accent-indigo-600" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} />
          Save as a frequently eaten food (favourite)
        </label>
        <label className="flex min-h-[44px] items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" className="mt-0.5 h-5 w-5 rounded accent-indigo-600" checked={approximate} onChange={(e) => setApproximate(e.target.checked)} />
          <span>
            These values are estimates
            <span className="block text-xs text-slate-500 dark:text-slate-400">Shows a “~” next to the calories as a reminder.</span>
          </span>
        </label>
      </form>
    </Modal>
  );
}
