import { useState } from 'react';
import { useHealth } from '../../hooks/useHealth';
import {
  ACTIVITY_LEVELS,
  DIETS,
  PACES,
  SEXES,
  cmToFtIn,
  computeMetrics,
  ftInToCm,
  metricsForProfile,
  round1,
  validateProfile,
  weightFromDisplay,
  weightToDisplay,
} from '../../lib/health';
import { useApp } from '../../store/AppContext';
import type { ActivityLevel, DietPreference, HealthProfile, LossPace, Sex, WeightGoal } from '../../types';
import { Modal } from '../ui/Modal';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useToast } from '../ui/Toast';
import { FieldError } from './shared';

const num = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')));
const str = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? '' : String(n));

export function ProfileForm({ onClose }: { onClose: () => void }) {
  const { actions } = useApp();
  const { profile, currentKg, today, metrics: currentMetrics } = useHealth();
  const toast = useToast();
  const isNew = !profile;

  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>(profile?.weightUnit ?? 'kg');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>(profile?.heightUnit ?? 'cm');

  const startHeight = profile?.heightCm ?? NaN;
  const startFt = Number.isFinite(startHeight) ? cmToFtIn(startHeight) : { ft: NaN, inch: NaN };

  const [age, setAge] = useState(str(profile?.age));
  const [sex, setSex] = useState<Sex>(profile?.sex ?? 'unspecified');
  const [heightCm, setHeightCm] = useState(str(profile ? Math.round(profile.heightCm) : null));
  const [ft, setFt] = useState(str(startFt.ft));
  const [inch, setInch] = useState(str(startFt.inch));
  const [weight, setWeight] = useState(str(profile && currentKg !== null ? weightToDisplay(currentKg, profile.weightUnit) : null));
  const [target, setTarget] = useState(str(profile ? weightToDisplay(profile.targetWeightKg, profile.weightUnit) : null));
  const [activity, setActivity] = useState<ActivityLevel>(profile?.activityLevel ?? 'light');
  const [goal, setGoal] = useState<WeightGoal>(profile?.goal ?? 'lose');
  const [pace, setPace] = useState<LossPace>(profile?.pace ?? 'steady');
  const [targetDate, setTargetDate] = useState(profile?.targetDate ?? '');
  const [diet, setDiet] = useState<DietPreference>(profile?.diet ?? 'vegetarian');
  const [customCal, setCustomCal] = useState(profile?.calorieTarget != null);
  const [calories, setCalories] = useState(str(profile?.calorieTarget));
  const [customPro, setCustomPro] = useState(profile?.proteinTarget != null);
  const [protein, setProtein] = useState(str(profile?.proteinTarget));
  const [water, setWater] = useState(str(profile?.waterTargetMl ?? 2500));
  const [exBudget, setExBudget] = useState(profile?.addExerciseToBudget ?? false);

  const [submitted, setSubmitted] = useState(false);
  const [asking, setAsking] = useState<null | { draft: HealthProfile; kg: number; oldCal: number; newCal: number; oldPro: number; newPro: number }>(null);

  const changeWeightUnit = (next: 'kg' | 'lb') => {
    if (next === weightUnit) return;
    const conv = (s: string) => {
      const n = num(s);
      return Number.isFinite(n) ? str(weightToDisplay(weightFromDisplay(n, weightUnit), next)) : s;
    };
    setWeight(conv(weight));
    setTarget(conv(target));
    setWeightUnit(next);
  };

  const changeHeightUnit = (next: 'cm' | 'ft') => {
    if (next === heightUnit) return;
    if (next === 'ft') {
      const cm = num(heightCm);
      if (Number.isFinite(cm)) {
        const r = cmToFtIn(cm);
        setFt(String(r.ft));
        setInch(String(r.inch));
      }
    } else {
      const f = num(ft);
      const i = num(inch);
      if (Number.isFinite(f)) setHeightCm(String(Math.round(ftInToCm(f, Number.isFinite(i) ? i : 0))));
    }
    setHeightUnit(next);
  };

  // ---- build the draft profile from the fields ----
  const heightValue = heightUnit === 'cm' ? num(heightCm) : round1(ftInToCm(num(ft), Number.isFinite(num(inch)) ? num(inch) : 0));
  const weightNum = num(weight);
  // Keep the exact stored kg when the visible number was not edited (avoids lb round-trip drift).
  const unchangedWeight = profile && currentKg !== null && weightNum === weightToDisplay(currentKg, weightUnit);
  const weightKg = unchangedWeight && currentKg !== null ? currentKg : weightFromDisplay(weightNum, weightUnit);
  const targetNum = num(target);
  const targetKg =
    goal === 'maintain'
      ? weightKg
      : profile && targetNum === weightToDisplay(profile.targetWeightKg, weightUnit)
        ? profile.targetWeightKg
        : weightFromDisplay(targetNum, weightUnit);

  const draft: HealthProfile = {
    age: num(age),
    sex,
    heightCm: heightValue,
    currentWeightKg: weightKg,
    targetWeightKg: targetKg,
    activityLevel: activity,
    goal,
    pace,
    targetDate: goal === 'lose' && targetDate ? targetDate : null,
    diet,
    calorieTarget: customCal ? num(calories) : null,
    proteinTarget: customPro ? num(protein) : null,
    waterTargetMl: num(water),
    weightUnit,
    heightUnit,
    addExerciseToBudget: exBudget,
  };

  const { errors, warnings } = validateProfile(draft, today);
  const basicsOk = !errors.age && !errors.heightCm && !errors.currentWeightKg;
  const preview = basicsOk
    ? computeMetrics({ age: draft.age, sex, heightCm: draft.heightCm, weightKg: draft.currentWeightKg, activityLevel: activity, goal, pace })
    : null;
  const valid = Object.keys(errors).length === 0;

  const commit = (final: HealthProfile, kg: number) => {
    actions.saveProfile(final, kg, today);
    toast.show(isNew ? 'Health profile saved' : 'Profile updated. Your estimates were recalculated.');
    onClose();
  };

  const save = () => {
    setSubmitted(true);
    if (!valid) return;
    if (profile && currentMetrics && (profile.calorieTarget !== null || profile.proteinTarget !== null)) {
      const next = metricsForProfile(draft, weightKg);
      const calChanged = profile.calorieTarget !== null && next.suggestedCalories !== currentMetrics.suggestedCalories;
      const proChanged = profile.proteinTarget !== null && next.suggestedProtein !== currentMetrics.suggestedProtein;
      if (calChanged || proChanged) {
        setAsking({
          draft,
          kg: weightKg,
          oldCal: profile.calorieTarget ?? currentMetrics.suggestedCalories,
          newCal: next.suggestedCalories,
          oldPro: profile.proteinTarget ?? currentMetrics.suggestedProtein,
          newPro: next.suggestedProtein,
        });
        return;
      }
    }
    commit(draft, weightKg);
  };

  const wLabel = weightUnit;
  const field = (id: string, label: string, value: string, set: (v: string) => void, error?: string, extra?: { placeholder?: string; inputMode?: 'numeric' | 'decimal' }) => (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="field" inputMode={extra?.inputMode ?? 'decimal'} placeholder={extra?.placeholder} value={value} onChange={(e) => set(e.target.value)} />
      {submitted && <FieldError message={error} />}
    </div>
  );

  const section = (title: string) => <h3 className="border-b border-slate-100 pb-1.5 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-white">{title}</h3>;

  return (
    <>
      <Modal
        title={isNew ? 'Set up health profile' : 'Edit health profile'}
        onClose={onClose}
        wide
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" form="profile-form" className="btn btn-primary">
              Save profile
            </button>
          </>
        }
      >
        <form
          id="profile-form"
          className="space-y-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              Weight <SegmentedControl label="Weight unit" value={weightUnit} onChange={changeWeightUnit} options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              Height <SegmentedControl label="Height unit" value={heightUnit} onChange={changeHeightUnit} options={[{ value: 'cm', label: 'cm' }, { value: 'ft', label: 'ft / in' }]} />
            </div>
          </div>

          {section('About you')}
          <div className="grid grid-cols-2 gap-3">
            {field('p-age', 'Age', age, setAge, errors.age, { inputMode: 'numeric' })}
            <div>
              <label className="field-label" htmlFor="p-sex">
                Sex (optional)
              </label>
              <select id="p-sex" className="field" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
                {SEXES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {heightUnit === 'cm' ? (
              field('p-height', 'Height (cm)', heightCm, setHeightCm, errors.heightCm)
            ) : (
              <div>
                <span className="field-label">Height</span>
                <div className="grid grid-cols-2 gap-2">
                  <input className="field" aria-label="Feet" inputMode="numeric" placeholder="ft" value={ft} onChange={(e) => setFt(e.target.value)} />
                  <input className="field" aria-label="Inches" inputMode="decimal" placeholder="in" value={inch} onChange={(e) => setInch(e.target.value)} />
                </div>
                {submitted && <FieldError message={errors.heightCm} />}
              </div>
            )}
            {field('p-weight', `Current weight (${wLabel})`, weight, setWeight, errors.currentWeightKg)}
          </div>

          {section('Your goal')}
          <div>
            <span className="field-label">Goal</span>
            <SegmentedControl label="Goal" value={goal} onChange={setGoal} options={[{ value: 'lose', label: 'Lose weight' }, { value: 'maintain', label: 'Maintain' }]} />
          </div>
          {goal === 'lose' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {field('p-target', `Target weight (${wLabel})`, target, setTarget, errors.targetWeightKg)}
                <div>
                  <label className="field-label" htmlFor="p-date">
                    Target date (optional)
                  </label>
                  <input id="p-date" type="date" className="field" value={targetDate} min={today} onChange={(e) => setTargetDate(e.target.value)} />
                  {submitted && <FieldError message={errors.targetDate} />}
                </div>
              </div>
              <div>
                <span className="field-label">Pace</span>
                <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Pace">
                  {PACES.map((p) => (
                    <button key={p.value} type="button" role="radio" aria-checked={pace === p.value} onClick={() => setPace(p.value)} className={`chip flex-col gap-0 ${pace === p.value ? 'chip-on' : 'chip-off'}`}>
                      {p.label}
                      <span className="text-[10px] font-normal opacity-80">{p.kgPerWeek} kg/wk</span>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">{PACES.find((p) => p.value === pace)?.description}</p>
              </div>
            </>
          )}

          {section('Lifestyle')}
          <div>
            <label className="field-label" htmlFor="p-activity">
              Activity level
            </label>
            <select id="p-activity" className="field" value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
              {ACTIVITY_LEVELS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label} — {a.description}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="p-diet">
              Diet preference
            </label>
            <select id="p-diet" className="field" value={diet} onChange={(e) => setDiet(e.target.value as DietPreference)}>
              {DIETS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {preview && (
            <div className="rounded-2xl bg-indigo-50 p-4 text-sm dark:bg-indigo-500/10" aria-live="polite">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Estimates from these details</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-700 dark:text-slate-200">
                <dt>BMI</dt>
                <dd className="text-right font-medium tabular-nums">
                  {preview.bmi.toFixed(1)} <span className="text-xs font-normal text-slate-500">({preview.bmiCategory})</span>
                </dd>
                <dt>BMR</dt>
                <dd className="text-right font-medium tabular-nums">~{preview.bmr} kcal</dd>
                <dt>Maintenance (TDEE)</dt>
                <dd className="text-right font-medium tabular-nums">~{preview.tdee} kcal</dd>
                <dt>{goal === 'lose' ? 'Suggested range' : 'Suggested intake'}</dt>
                <dd className="text-right font-medium tabular-nums">
                  {preview.calorieRange.low}–{preview.calorieRange.high} kcal
                </dd>
                <dt>Suggested protein</dt>
                <dd className="text-right font-medium tabular-nums">~{preview.suggestedProtein} g</dd>
              </dl>
              {preview.limited && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">The deficit was limited to stay within safe bounds.</p>}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Estimates only. Individual needs vary.</p>
            </div>
          )}

          {section('Daily targets')}
          <div className="space-y-3">
            <div>
              <label className="flex min-h-[44px] items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                <input type="checkbox" className="h-5 w-5 rounded accent-indigo-600" checked={customCal} onChange={(e) => { setCustomCal(e.target.checked); if (e.target.checked && !calories && preview) setCalories(String(preview.suggestedCalories)); }} />
                Set my own calorie target
              </label>
              {customCal ? (
                <>
                  <input className="field" aria-label="Daily calorie target" inputMode="numeric" value={calories} onChange={(e) => setCalories(e.target.value)} />
                  {submitted && <FieldError message={errors.calorieTarget} />}
                </>
              ) : (
                <p className="text-xs text-slate-500">Using the suggested {preview ? `~${preview.suggestedCalories} kcal` : 'estimate'}.</p>
              )}
            </div>
            <div>
              <label className="flex min-h-[44px] items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                <input type="checkbox" className="h-5 w-5 rounded accent-indigo-600" checked={customPro} onChange={(e) => { setCustomPro(e.target.checked); if (e.target.checked && !protein && preview) setProtein(String(preview.suggestedProtein)); }} />
                Set my own protein target
              </label>
              {customPro ? (
                <>
                  <input className="field" aria-label="Daily protein target in grams" inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} />
                  {submitted && <FieldError message={errors.proteinTarget} />}
                </>
              ) : (
                <p className="text-xs text-slate-500">Using the suggested {preview ? `~${preview.suggestedProtein} g` : 'estimate'}.</p>
              )}
            </div>
            {field('p-water', 'Water target (ml per day)', water, setWater, errors.waterTargetMl, { inputMode: 'numeric' })}
            <label className="flex min-h-[44px] items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" className="mt-0.5 h-5 w-5 rounded accent-indigo-600" checked={exBudget} onChange={(e) => setExBudget(e.target.checked)} />
              <span>
                Add some exercise calories to my daily budget
                <span className="block text-xs text-slate-500 dark:text-slate-400">Off by default. When on, only half of the logged (estimated) burn is added, since estimates run high.</span>
              </span>
            </label>
          </div>

          {warnings.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200" role="status">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          {submitted && !valid && (
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400" role="alert">
              Please fix the highlighted fields.
            </p>
          )}
        </form>
      </Modal>

      {asking && (
        <Modal
          title="Update your custom targets?"
          onClose={() => setAsking(null)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => commit(asking.draft, asking.kg)}>
                Keep my targets
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  commit(
                    {
                      ...asking.draft,
                      calorieTarget: asking.draft.calorieTarget !== null ? null : asking.draft.calorieTarget,
                      proteinTarget: asking.draft.proteinTarget !== null ? null : asking.draft.proteinTarget,
                    },
                    asking.kg,
                  )
                }
              >
                Use new suggestions
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">Your changes alter the suggested targets, but you had set your own. Which would you like?</p>
          <ul className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-200">
            {asking.draft.calorieTarget !== null && (
              <li>
                Calories: you have <strong>{asking.oldCal} kcal</strong>, suggested now <strong>~{asking.newCal} kcal</strong>
              </li>
            )}
            {asking.draft.proteinTarget !== null && (
              <li>
                Protein: you have <strong>{asking.oldPro} g</strong>, suggested now <strong>~{asking.newPro} g</strong>
              </li>
            )}
          </ul>
        </Modal>
      )}
    </>
  );
}
