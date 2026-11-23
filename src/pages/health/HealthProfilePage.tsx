import { PencilLine, RotateCcw, Trash2, UserCog } from 'lucide-react';
import { useState } from 'react';
import { HealthTabs } from '../../components/health/HealthTabs';
import { ProfileForm } from '../../components/health/ProfileForm';
import { Disclaimer, SectionTitle } from '../../components/health/shared';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { useHealth } from '../../hooks/useHealth';
import { ACTIVITY_LEVELS, DIETS, PACES, estimateGoalDate, formatHeight, formatWeight } from '../../lib/health';
import { formatDateLong } from '../../lib/healthStats';
import { useApp } from '../../store/AppContext';
import type { Page } from '../../types';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

export function HealthProfilePage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { actions } = useApp();
  const toast = useToast();
  const { profile, metrics, targets, currentKg, today, weightUnit, heightUnit } = useHealth();
  const [editing, setEditing] = useState(false);
  const [resetting, setResetting] = useState(false);

  const eta = profile && currentKg !== null ? estimateGoalDate(profile, currentKg, today) : null;

  const patch = (changes: Partial<NonNullable<typeof profile>>, message: string) => {
    if (!profile || currentKg === null) return;
    actions.saveProfile({ ...profile, ...changes }, currentKg, today);
    toast.show(message);
  };

  return (
    <div className="space-y-5">
      <HealthTabs page="health-profile" onNavigate={onNavigate} />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Health profile &amp; settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Your details drive the estimates and daily targets.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>
          <PencilLine size={17} /> {profile ? 'Edit profile' : 'Set up profile'}
        </button>
      </header>

      {!profile || !metrics || !targets || currentKg === null ? (
        <EmptyState icon={<UserCog size={22} />} title="No profile yet" description="Add your details to see BMI, calorie and protein estimates." />
      ) : (
        <>
          <section className="card p-4 sm:p-5">
            <SectionTitle title="Your details" />
            <dl className="divide-y divide-slate-100 dark:divide-slate-800">
              <Row label="Age" value={`${profile.age} years`} />
              <Row label="Sex" value={profile.sex === 'unspecified' ? 'Not specified' : profile.sex === 'male' ? 'Male' : 'Female'} />
              <Row label="Height" value={formatHeight(profile.heightCm, heightUnit)} />
              <Row label="Current weight" value={formatWeight(currentKg, weightUnit)} />
              <Row label="Goal" value={profile.goal === 'lose' ? `Lose weight to ${formatWeight(profile.targetWeightKg, weightUnit)}` : 'Maintain weight'} />
              {profile.goal === 'lose' && <Row label="Pace" value={PACES.find((p) => p.value === profile.pace)?.label ?? ''} />}
              {profile.goal === 'lose' && profile.targetDate && <Row label="Target date" value={formatDateLong(profile.targetDate)} />}
              {eta && <Row label="Estimated at this pace" value={`about ${Math.ceil(eta.weeks)} weeks (${formatDateLong(eta.dateKey)})`} />}
              <Row label="Activity" value={ACTIVITY_LEVELS.find((a) => a.value === profile.activityLevel)?.label ?? ''} />
              <Row label="Diet" value={DIETS.find((d) => d.value === profile.diet)?.label ?? ''} />
            </dl>
          </section>

          <section className="card p-4 sm:p-5">
            <SectionTitle title="Estimates" subtitle="Calculated from your details. These are approximations, not measurements." />
            <dl className="divide-y divide-slate-100 dark:divide-slate-800">
              <Row label="BMI" value={`${metrics.bmi.toFixed(1)} (${metrics.bmiCategory})`} />
              <Row label="BMR (resting energy)" value={`~${metrics.bmr} kcal`} />
              <Row label="TDEE (maintenance)" value={`~${metrics.tdee} kcal`} />
              <Row label={profile.goal === 'lose' ? 'Suggested range for gradual loss' : 'Suggested intake'} value={`${metrics.calorieRange.low}–${metrics.calorieRange.high} kcal`} />
              <Row label="Suggested protein" value={`~${metrics.suggestedProtein} g (${metrics.proteinRange.low}–${metrics.proteinRange.high} g)`} />
            </dl>
            {metrics.limited && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">The calorie deficit was limited to stay within safe bounds.</p>}
            <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              BMI does not distinguish muscle from fat and does not account for body frame, age or ethnicity, so treat it as a rough screening number. Calorie
              estimates use the Mifflin-St Jeor equation and an activity multiplier; real needs vary from person to person.
            </p>
          </section>

          <section className="card p-4 sm:p-5">
            <SectionTitle title="Daily targets" />
            <dl className="divide-y divide-slate-100 dark:divide-slate-800">
              <Row
                label="Calories"
                value={
                  <span className="inline-flex flex-wrap items-center justify-end gap-2">
                    {targets.calories} kcal
                    <Badge custom={targets.customCalories} />
                    {targets.customCalories && (
                      <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => patch({ calorieTarget: null }, 'Using the suggested calorie target')}>
                        <RotateCcw size={12} /> Use suggested
                      </button>
                    )}
                  </span>
                }
              />
              <Row
                label="Protein"
                value={
                  <span className="inline-flex flex-wrap items-center justify-end gap-2">
                    {targets.protein} g
                    <Badge custom={targets.customProtein} />
                    {targets.customProtein && (
                      <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => patch({ proteinTarget: null }, 'Using the suggested protein target')}>
                        <RotateCcw size={12} /> Use suggested
                      </button>
                    )}
                  </span>
                }
              />
              <Row label="Water" value={`${targets.waterMl} ml`} />
            </dl>
            <label className="mt-3 flex min-h-[44px] items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" className="mt-0.5 h-5 w-5 rounded accent-indigo-600" checked={profile.addExerciseToBudget} onChange={(e) => patch({ addExerciseToBudget: e.target.checked }, e.target.checked ? 'Half of logged exercise calories now count toward your budget' : 'Exercise no longer changes your budget')} />
              <span>
                Add exercise calories to my daily budget
                <span className="block text-xs text-slate-500 dark:text-slate-400">Off by default. When on, half of logged exercise calories are added, because exercise estimates tend to run high.</span>
              </span>
            </label>
          </section>
        </>
      )}

      <section className="card border-rose-200 p-4 dark:border-rose-500/30 sm:p-5">
        <SectionTitle title="Health data" subtitle="Everything is stored only in this browser. Use Settings → Export to back it up." />
        <button type="button" className="btn btn-secondary text-rose-600 dark:text-rose-400" onClick={() => setResetting(true)}>
          <Trash2 size={16} /> Delete all health data
        </button>
      </section>

      <Disclaimer />
      {editing && <ProfileForm onClose={() => setEditing(false)} />}
      {resetting && (
        <ConfirmDialog
          danger
          title="Delete all health data?"
          message="This permanently removes your profile, weight history, food diary, custom foods, water and exercise logs from this browser. Your timetable and goals are not affected. Export a backup first if you might want it back."
          confirmLabel="Delete health data"
          onConfirm={() => {
            actions.resetHealth();
            toast.show('Health data deleted');
          }}
          onCancel={() => setResetting(false)}
        />
      )}
    </div>
  );
}

function Badge({ custom }: { custom: boolean }) {
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${custom ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
      {custom ? 'YOUR OWN' : 'SUGGESTED'}
    </span>
  );
}
