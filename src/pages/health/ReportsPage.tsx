import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalorieChart, WeightChart, type WeightDatum } from '../../components/health/charts';
import { HealthTabs } from '../../components/health/HealthTabs';
import { Disclaimer, SectionTitle, StatCard } from '../../components/health/shared';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useHealth } from '../../hooks/useHealth';
import { MEAL_TYPES, formatWeight, weightToDisplay } from '../../lib/health';
import { addDays, buildReport, formatShortDate, sortedWeights } from '../../lib/healthStats';
import { useApp } from '../../store/AppContext';
import type { Page } from '../../types';
import { Dumbbell, Droplets, Flame, Scale, Utensils } from 'lucide-react';

type Range = 'week' | 'month' | 'custom';

export function ReportsPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { isDark } = useApp();
  const { health, today, targets, profile, weightUnit } = useHealth();
  const [range, setRange] = useState<Range>('week');
  const [customFrom, setCustomFrom] = useState(addDays(today, -13));
  const [customTo, setCustomTo] = useState(today);

  let from = range === 'week' ? addDays(today, -6) : range === 'month' ? addDays(today, -29) : customFrom;
  let to = range === 'custom' ? customTo : today;
  const badRange = from > to;
  if (badRange) [from, to] = [to, from];
  const tooLong = range === 'custom' && addDays(from, 366) < to;
  if (tooLong) from = addDays(to, -366);

  const report = useMemo(() => buildReport(health, from, to), [health, from, to]);

  const weightData: WeightDatum[] = useMemo(() => {
    const list = sortedWeights(health.weightEntries).filter((w) => w.date >= from && w.date <= to);
    return list.map((w) => ({ key: w.date, label: formatShortDate(w.date), kg: w.kg, avg: null }));
  }, [health.weightEntries, from, to]);

  const mealRows = MEAL_TYPES.map((m) => ({ name: m.short, kcal: Math.round(report.mealAverages[m.value]) })).filter((r) => r.kcal > 0 || r.name !== 'Other');
  const axis = isDark ? '#94a3b8' : '#64748b';
  const grid = isDark ? '#1e293b' : '#e2e8f0';
  const w = report.weight;

  return (
    <div className="space-y-5">
      <HealthTabs page="health-reports" onNavigate={onNavigate} />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatShortDate(from)} – {formatShortDate(to)} · {report.days} days
          </p>
        </div>
        <SegmentedControl label="Report period" value={range} onChange={setRange} options={[{ value: 'week', label: '7 days' }, { value: 'month', label: '30 days' }, { value: 'custom', label: 'Custom' }]} />
      </header>

      {range === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor="r-from">From</label>
            <input id="r-from" type="date" className="field" value={customFrom} max={today} onChange={(e) => e.target.value && setCustomFrom(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="r-to">To</label>
            <input id="r-to" type="date" className="field" value={customTo} max={today} onChange={(e) => e.target.value && setCustomTo(e.target.value)} />
          </div>
          {(badRange || tooLong) && <p className="col-span-2 text-xs text-amber-700 dark:text-amber-300">{badRange ? 'The start was after the end, so the dates were swapped.' : 'Reports are limited to one year.'}</p>}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Weight change"
          icon={<Scale size={18} />}
          color="#6366f1"
          value={w.change === null ? '—' : `${w.change > 0 ? '+' : w.change < 0 ? '−' : ''}${Math.abs(weightToDisplay(Math.abs(w.change), weightUnit)).toFixed(1)} ${weightUnit}`}
          sub={w.change === null ? 'Needs weights at the start and end' : `Average of the first and last ${w.windowDays} days`}
        />
        <StatCard label="Avg calories" icon={<Flame size={18} />} color="#f97316" value={report.avgCalories === null ? '—' : `${Math.round(report.avgCalories)}`} sub={`${report.loggedDays} of ${report.days} days logged`} />
        <StatCard label="Avg protein" icon={<Utensils size={18} />} color="#6366f1" value={report.avgProtein === null ? '—' : `${Math.round(report.avgProtein)} g`} sub={targets ? `Target ${targets.protein} g` : undefined} />
        <StatCard label="Avg water" icon={<Droplets size={18} />} color="#0ea5e9" value={report.avgWaterMl === null ? '—' : `${Math.round(report.avgWaterMl)} ml`} sub={`${report.waterDays} day${report.waterDays === 1 ? "" : "s"} logged`} />
        <StatCard label="Exercise" icon={<Dumbbell size={18} />} color="#14b8a6" value={`${report.exerciseDays} day${report.exerciseDays === 1 ? '' : 's'}`} sub={`${report.exerciseSessions} sessions · ${report.exerciseMinutes} min`} />
      </section>

      <section className="card p-4 sm:p-5">
        <SectionTitle title="Calories per day" subtitle="Days with no food logged are left blank, not counted as zero." />
        {report.loggedDays === 0 ? <p className="py-8 text-center text-sm text-slate-500">No food logged in this period.</p> : <CalorieChart data={report.daily} target={targets?.calories ?? null} />}
      </section>

      <section className="card p-4 sm:p-5">
        <SectionTitle title="Calories by meal" subtitle="Average per logged day" />
        {report.loggedDays === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No food logged in this period.</p>
        ) : (
          <div style={{ height: 200 }} role="img" aria-label="Average calories by meal">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mealRows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [`${v} kcal`, 'Average']} />
                <Bar dataKey="kcal" fill="#f97316" radius={[5, 5, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="card p-4 sm:p-5">
        <SectionTitle title="Weight in this period" />
        {weightData.length < 2 ? (
          <p className="py-8 text-center text-sm text-slate-500">Add at least two weights in this period to see a chart.</p>
        ) : (
          <>
            <WeightChart data={weightData} unit={weightUnit} targetKg={profile && profile.goal === 'lose' ? profile.targetWeightKg : null} avgName="" />
            {w.startAvg !== null && w.endAvg !== null && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Start of period {formatWeight(w.startAvg, weightUnit)} → end {formatWeight(w.endAvg, weightUnit)}
              </p>
            )}
          </>
        )}
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Change is measured between averages, so one heavy or light day does not read as fat gained or lost.</p>
      </section>

      <Disclaimer />
    </div>
  );
}
