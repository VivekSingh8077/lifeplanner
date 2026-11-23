import { PencilLine, Plus, Scale, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { WeightChart, type WeightDatum } from '../../components/health/charts';
import { HealthTabs } from '../../components/health/HealthTabs';
import { Disclaimer, SectionTitle, StatCard } from '../../components/health/shared';
import { WeightFormModal } from '../../components/health/WeightFormModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useToast } from '../../components/ui/Toast';
import { useHealth } from '../../hooks/useHealth';
import { formatWeight, weightToDisplay } from '../../lib/health';
import { averageWeightLast, formatDateLong, formatShortDate, monthlyAverages, sortedWeights, weeklyAverages, weightSeries } from '../../lib/healthStats';
import { useApp } from '../../store/AppContext';
import type { Page, WeightEntry } from '../../types';

type View = 'daily' | 'weekly' | 'monthly';

export function WeightTrackerPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { actions } = useApp();
  const toast = useToast();
  const { health, profile, today, currentKg, startKg, weightUnit } = useHealth();
  const [view, setView] = useState<View>('daily');
  const [form, setForm] = useState<{ entry?: WeightEntry } | null>(null);
  const [deleting, setDeleting] = useState<WeightEntry | null>(null);

  const entries = health.weightEntries;
  const history = useMemo(() => [...sortedWeights(entries)].reverse(), [entries]);
  const series = useMemo(() => weightSeries(entries), [entries]);

  const chartData: WeightDatum[] = useMemo(() => {
    if (view === 'daily') return series.map((p) => ({ key: p.date, label: formatShortDate(p.date), kg: p.kg, avg: p.avg7 }));
    const groups = view === 'weekly' ? weeklyAverages(entries) : monthlyAverages(entries);
    return groups.map((g) => ({ key: g.key, label: view === 'weekly' ? formatShortDate(g.key) : g.label, kg: null, avg: g.avg }));
  }, [view, series, entries]);

  const avg7 = averageWeightLast(entries, today, 7);
  const avg30 = averageWeightLast(entries, today, 30);

  return (
    <div className="space-y-5">
      <HealthTabs page="health-weight" onNavigate={onNavigate} />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Weight</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Watch the trend, not a single day.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setForm({})}>
          <Plus size={17} /> Add weight
        </button>
      </header>

      {entries.length === 0 ? (
        <EmptyState
          icon={<Scale size={22} />}
          title="No weight entries yet"
          description="Add your first weight to start a history and see your trend. Weighing at a similar time each day makes readings comparable."
          action={
            <button type="button" className="btn btn-primary" onClick={() => setForm({})}>
              <Plus size={17} /> Add first entry
            </button>
          }
        />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Starting" icon={<Scale size={18} />} color="#94a3b8" value={startKg !== null ? formatWeight(startKg, weightUnit) : '—'} />
            <StatCard label="Current" icon={<Scale size={18} />} color="#6366f1" value={currentKg !== null ? formatWeight(currentKg, weightUnit) : '—'} />
            <StatCard label="Target" icon={<Scale size={18} />} color="#10b981" value={profile && profile.goal === 'lose' ? formatWeight(profile.targetWeightKg, weightUnit) : '—'} />
            <StatCard label="7-day average" icon={<Scale size={18} />} color="#f59e0b" value={avg7 !== null ? formatWeight(avg7, weightUnit) : '—'} sub={avg30 !== null ? `30-day: ${formatWeight(avg30, weightUnit)}` : undefined} />
          </section>

          <section className="card p-4 sm:p-5">
            <SectionTitle title="Trend" action={<SegmentedControl label="Chart view" value={view} onChange={setView} options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]} />} />
            {chartData.length < 2 ? (
              <p className="py-10 text-center text-sm text-slate-500">Add at least two {view === 'daily' ? 'entries' : view === 'weekly' ? 'weeks of entries' : 'months of entries'} to see a trend.</p>
            ) : (
              <WeightChart
                data={chartData}
                unit={weightUnit}
                targetKg={profile && profile.goal === 'lose' ? profile.targetWeightKg : null}
                showPoints={view === 'daily'}
                rawName="Daily weight"
                avgName={view === 'daily' ? '7-day average' : view === 'weekly' ? 'Weekly average' : 'Monthly average'}
              />
            )}
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">The coloured line smooths out daily ups and downs from water, food and salt. A single reading does not show fat change.</p>
          </section>

          <section>
            <SectionTitle title="History" subtitle={`${history.length} entr${history.length === 1 ? 'y' : 'ies'}`} />
            <ul className="card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
              {history.map((e, i) => {
                const prev = history[i + 1];
                const diff = prev ? e.kg - prev.kg : null;
                return (
                  <li key={e.id} className="flex items-center gap-1 py-1 pl-4 pr-1">
                    <div className="min-w-0 flex-1 py-1.5">
                      <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {weightToDisplay(e.kg, weightUnit)} {weightUnit}
                        {diff !== null && Math.abs(weightToDisplay(e.kg, weightUnit) - weightToDisplay(prev.kg, weightUnit)) > 0 && (
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            {diff > 0 ? '+' : '−'}
                            {Math.abs(weightToDisplay(Math.abs(diff), weightUnit) * 1).toFixed(1)}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {formatDateLong(e.date)}
                        {e.note ? ` · ${e.note}` : ''}
                      </p>
                    </div>
                    <button type="button" className="btn-icon" aria-label={`Edit entry from ${formatDateLong(e.date)}`} onClick={() => setForm({ entry: e })}>
                      <PencilLine size={17} />
                    </button>
                    <button type="button" className="btn-icon hover:text-rose-600" aria-label={`Delete entry from ${formatDateLong(e.date)}`} onClick={() => setDeleting(e)}>
                      <Trash2 size={17} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <Disclaimer>Weight changes day to day for many reasons. This tracker is a wellness aid, not medical advice. Your history is kept even when you change your profile.</Disclaimer>

      {form && <WeightFormModal entry={form.entry} today={today} unit={weightUnit} onClose={() => setForm(null)} />}
      {deleting && (
        <ConfirmDialog
          danger
          title="Delete weight entry?"
          message={`Remove ${weightToDisplay(deleting.kg, weightUnit)} ${weightUnit} on ${formatDateLong(deleting.date)}? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            actions.deleteWeight(deleting.id);
            toast.show('Weight entry deleted');
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
