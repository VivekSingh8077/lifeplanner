import { Droplets, Dumbbell, Flame, HeartPulse, Plus, Scale, Target, UserCog, Utensils } from 'lucide-react';
import { useState } from 'react';
import { CalorieChart } from '../../components/health/charts';
import { ExerciseModal } from '../../components/health/ExerciseModal';
import { FoodEntryModal } from '../../components/health/FoodEntryModal';
import { HealthTabs } from '../../components/health/HealthTabs';
import { ProfileForm } from '../../components/health/ProfileForm';
import { Disclaimer, MACRO_COLORS, SectionTitle, StatCard } from '../../components/health/shared';
import { WaterModal } from '../../components/health/WaterModal';
import { WeightFormModal } from '../../components/health/WeightFormModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useHealth } from '../../hooks/useHealth';
import { MEAL_TYPES, calorieBudget, formatWeight, round1 } from '../../lib/health';
import { addDays, buildReport, exerciseOn, mealsOn, nutritionForEntries, waterOn } from '../../lib/healthStats';
import type { MealType, Page } from '../../types';

type Dialog = null | 'food' | 'weight' | 'water' | 'exercise' | 'profile';

export function HealthOverviewPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const h = useHealth();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [mealForFood, setMealForFood] = useState<MealType>('breakfast');
  const { profile, targets, currentKg, today, health, weightUnit } = h;

  const entries = mealsOn(health, today);
  const n = nutritionForEntries(entries);
  const water = waterOn(health.waterEntries, today);
  const ex = exerciseOn(health.exerciseEntries, today);

  const close = () => setDialog(null);
  const openFood = (meal: MealType) => {
    setMealForFood(meal);
    setDialog('food');
  };

  const dialogs = (
    <>
      {dialog === 'food' && <FoodEntryModal date={today} defaultMeal={mealForFood} onClose={close} />}
      {dialog === 'weight' && <WeightFormModal today={today} unit={weightUnit} onClose={close} />}
      {dialog === 'water' && <WaterModal date={today} targetMl={targets?.waterMl ?? 2500} onClose={close} />}
      {dialog === 'exercise' && <ExerciseModal date={today} weightKg={currentKg} onClose={close} />}
      {dialog === 'profile' && <ProfileForm onClose={close} />}
    </>
  );

  if (!profile || !targets || currentKg === null) {
    return (
      <div className="space-y-5">
        <HealthTabs page="health" onNavigate={onNavigate} />
        <header>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Health &amp; Fitness</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track meals, weight, water and exercise in one calm place.</p>
        </header>
        <EmptyState
          icon={<HeartPulse size={22} />}
          title="Set up your health profile"
          description="Add your age, height, weight and goal to get estimated calorie and protein targets. You can still log food and water first if you prefer."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className="btn btn-primary" onClick={() => setDialog('profile')}>
                <UserCog size={17} /> Set up profile
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => onNavigate('health-food')}>
                <Utensils size={17} /> Open food diary
              </button>
            </div>
          }
        />
        <Disclaimer />
        {dialogs}
      </div>
    );
  }

  const bud = calorieBudget(targets.calories, profile.addExerciseToBudget, ex.calories, n.calories);
  const over = bud.remaining < 0;
  const lost = h.startKg !== null ? h.startKg - currentKg : 0;
  const toGo = profile.goal === 'lose' ? Math.max(0, currentKg - profile.targetWeightKg) : 0;
  const totalToLose = h.startKg !== null && profile.goal === 'lose' ? h.startKg - profile.targetWeightKg : 0;
  const pct = totalToLose > 0 ? Math.max(0, Math.min(100, (lost / totalToLose) * 100)) : 0;

  const week = buildReport(health, addDays(today, -6), today);

  const actions = [
    { label: 'Log food', icon: <Utensils size={20} />, run: () => openFood(guessMeal()) },
    { label: 'Add weight', icon: <Scale size={20} />, run: () => setDialog('weight') },
    { label: 'Add water', icon: <Droplets size={20} />, run: () => setDialog('water') },
    { label: 'Log exercise', icon: <Dumbbell size={20} />, run: () => setDialog('exercise') },
    { label: 'Edit profile', icon: <UserCog size={20} />, run: () => setDialog('profile') },
  ];

  return (
    <div className="space-y-6">
      <HealthTabs page="health" onNavigate={onNavigate} />
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Health &amp; Fitness</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Today at a glance</p>
      </header>

      <section aria-label="Quick actions" className="grid grid-cols-5 gap-2">
        {actions.map((a) => (
          <button key={a.label} type="button" onClick={a.run} className="card flex min-h-[72px] flex-col items-center justify-center gap-1.5 px-1 text-center text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-xs">
            <span className="text-indigo-600 dark:text-indigo-400">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </section>

      <section aria-label="Today's summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Current weight" icon={<Scale size={18} />} color="#6366f1" value={formatWeight(currentKg, weightUnit)} sub={profile.goal === 'lose' ? `Target ${formatWeight(profile.targetWeightKg, weightUnit)}` : 'Maintaining'} />
        <StatCard label={profile.goal === 'lose' ? 'Left to lose' : 'Goal'} icon={<Target size={18} />} color="#10b981" value={profile.goal === 'lose' ? formatWeight(toGo, weightUnit) : 'Maintain'} sub={profile.goal === 'lose' ? `${pct.toFixed(0)}% of the way` : undefined} />
        <StatCard
          label="Calories today"
          icon={<Flame size={18} />}
          color="#f97316"
          value={`${n.calories}`}
          progress={(n.calories / bud.budget) * 100}
          warn={over}
          sub={over ? `${Math.abs(bud.remaining)} kcal over ${bud.budget}` : `${bud.remaining} left of ${bud.budget}`}
        />
        <StatCard label="Protein" icon={<Utensils size={18} />} color={MACRO_COLORS.protein} value={`${round1(n.protein)} g`} progress={(n.protein / targets.protein) * 100} sub={`Target ${targets.protein} g`} />
        <StatCard label="Water" icon={<Droplets size={18} />} color="#0ea5e9" value={`${water} ml`} progress={(water / targets.waterMl) * 100} sub={`Target ${targets.waterMl} ml`} />
        <StatCard label="Exercise" icon={<Dumbbell size={18} />} color="#14b8a6" value={ex.sessions ? `${ex.minutes} min` : '—'} sub={ex.sessions ? `${ex.sessions} session${ex.sessions > 1 ? 's' : ''}` : 'Nothing logged yet'} />
        <StatCard label="Daily target" icon={<Target size={18} />} color="#8b5cf6" value={`${targets.calories} kcal`} sub={targets.customCalories ? 'Your own target' : 'Estimated suggestion'} />
        <StatCard label="Weight lost so far" icon={<Scale size={18} />} color="#ec4899" value={h.startKg === null ? '—' : lost >= 0 ? formatWeight(lost, weightUnit) : `+${formatWeight(-lost, weightUnit)}`} sub="Since your first entry" />
      </section>

      {profile.goal === 'lose' && h.startKg !== null && (
        <section className="card p-4 sm:p-5">
          <SectionTitle title="Weight progress" action={<button type="button" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => onNavigate('health-weight')}>Details</button>} />
          <div className="flex items-baseline justify-between text-sm text-slate-600 dark:text-slate-300">
            <span>Start {formatWeight(h.startKg, weightUnit)}</span>
            <span className="font-semibold text-slate-900 dark:text-white">Now {formatWeight(currentKg, weightUnit)}</span>
            <span>Target {formatWeight(profile.targetWeightKg, weightUnit)}</span>
          </div>
          <ProgressBar className="mt-2 !h-3" value={pct} color="#10b981" label="Progress toward target weight" />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{pct.toFixed(0)}% complete. Day-to-day readings move with water and food, so look at the trend, not a single day.</p>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <SectionTitle title="Today's nutrition" />
          <div className="space-y-3">
            <Macro label="Calories" value={n.calories} target={bud.budget} unit="kcal" color="#f97316" />
            <Macro label="Protein" value={round1(n.protein)} target={targets.protein} unit="g" color={MACRO_COLORS.protein} />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500">Carbs</p>
                <p className="font-semibold tabular-nums" style={{ color: MACRO_COLORS.carbs }}>{round1(n.carbs)} g</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500">Fat</p>
                <p className="font-semibold tabular-nums" style={{ color: MACRO_COLORS.fat }}>{round1(n.fat)} g</p>
              </div>
            </div>
            {bud.exerciseBonus > 0 && <p className="text-xs text-slate-500">Budget includes +{bud.exerciseBonus} kcal from exercise (your setting).</p>}
          </div>
          <p className="mb-1 mt-5 text-sm font-medium text-slate-700 dark:text-slate-200">Last 7 days</p>
          <CalorieChart data={week.daily} target={targets.calories} height={170} />
        </section>

        <section className="card p-4 sm:p-5">
          <SectionTitle title="Today's meals" />
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {MEAL_TYPES.filter((m) => m.value !== 'other' || entries.some((e) => e.meal === 'other')).map((m) => {
              const list = entries.filter((e) => e.meal === m.value);
              const kcal = list.reduce((s, e) => s + e.calories, 0);
              return (
                <li key={m.value} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{m.label}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{list.length ? list.map((e) => e.name).join(', ') : 'Nothing logged'}</p>
                  </div>
                  <p className="shrink-0 pt-0.5 text-sm font-medium tabular-nums text-slate-700 dark:text-slate-200">{list.length ? `${kcal} kcal` : ''}</p>
                  <button type="button" className="btn-icon -my-1.5" aria-label={`Log food for ${m.label}`} onClick={() => openFood(m.value)}>
                    <Plus size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="card flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-white">Your profile</p>
          <p className="truncate">
            {profile.age} yrs · {profile.goal === 'lose' ? 'Weight loss' : 'Maintain'} · {h.metrics ? `BMI ${h.metrics.bmi.toFixed(1)}` : ''}
          </p>
        </div>
        <button type="button" className="btn btn-secondary shrink-0" onClick={() => onNavigate('health-profile')}>
          View
        </button>
      </section>

      <Disclaimer />
      {dialogs}
    </div>
  );
}

function Macro({ label, value, target, unit, color }: { label: string; value: number; target: number; unit: string; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="tabular-nums text-slate-900 dark:text-white">
          <strong>{value}</strong> / {target} {unit}
        </span>
      </div>
      <ProgressBar value={(value / target) * 100} color={color} label={label} />
    </div>
  );
}

/** Pick a sensible meal for the current time of day. */
function guessMeal(): MealType {
  const hr = new Date().getHours();
  if (hr < 11) return 'breakfast';
  if (hr < 15) return 'lunch';
  if (hr < 19) return 'evening';
  return 'dinner';
}
