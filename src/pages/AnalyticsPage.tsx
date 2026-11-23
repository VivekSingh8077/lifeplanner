import { CalendarX2 } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '../components/ui/EmptyState';
import { ProgressBar } from '../components/ui/ProgressBar';
import { analyzeWeek } from '../lib/analytics';
import { DAY_NAMES, DAY_SHORT } from '../lib/dates';
import { formatDuration, formatHours, minutesToHours } from '../lib/time';
import { useApp } from '../store/AppContext';

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: { name?: string; color?: string; percent?: number };
}

function ChartTooltip({
  active,
  payload,
  label,
  showTotal,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  showTotal?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => Number(p.value) > 0);
  const total = rows.reduce((n, p) => n + Number(p.value), 0);
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
      {label !== undefined && <p className="mb-1 font-semibold text-slate-900 dark:text-white">{label}</p>}
      {rows.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color ?? p.payload?.color }} />
          {p.name ?? p.payload?.name}: <span className="font-medium tabular-nums">{Number(p.value).toFixed(1)}h</span>
          {p.payload?.percent !== undefined && <span className="text-slate-400">({p.payload.percent.toFixed(1)}%)</span>}
        </p>
      ))}
      {showTotal && rows.length > 1 && (
        <p className="mt-1 border-t border-slate-100 pt-1 font-semibold text-slate-900 dark:border-slate-700 dark:text-white">
          Total: {total.toFixed(1)}h
        </p>
      )}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      {subtitle && <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-3'}>{children}</div>
    </section>
  );
}

export function AnalyticsPage() {
  const { data, isDark } = useApp();
  const week = useMemo(() => analyzeWeek(data.timetable, data.categories), [data.timetable, data.categories]);

  const axis = isDark ? '#94a3b8' : '#64748b';
  const grid = isDark ? '#1e293b' : '#e2e8f0';

  const barData = week.totals.map((t) => ({
    name: t.category.name,
    hours: minutesToHours(t.minutes),
    color: t.category.color,
  }));

  const weekMinutes = 7 * 1440;
  const pieData = [
    ...week.totals.map((t) => ({
      name: t.category.name,
      value: minutesToHours(t.minutes),
      color: t.category.color,
      percent: (t.minutes / weekMinutes) * 100,
    })),
    ...(week.unscheduledMinutes > 0
      ? [
          {
            name: 'Unscheduled',
            value: minutesToHours(week.unscheduledMinutes),
            color: isDark ? '#334155' : '#cbd5e1',
            percent: (week.unscheduledMinutes / weekMinutes) * 100,
          },
        ]
      : []),
  ];

  const studyCategories = data.categories.filter((c) => c.kind === 'study');
  const dailyStudy = week.days.map((d) => {
    const row: Record<string, number | string> = { day: DAY_SHORT[d.day], total: minutesToHours(d.studyMinutes) };
    for (const c of studyCategories) row[c.id] = minutesToHours(d.byCategory[c.id] ?? 0);
    return row;
  });

  if (week.scheduledMinutes === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Weekly analytics</h1>
        <EmptyState
          icon={<CalendarX2 size={22} />}
          title="Nothing to analyse yet"
          description="Add activities to your timetable and your weekly time allocation will appear here."
        />
      </div>
    );
  }

  const maxStudyDay = Math.max(...week.days.map((d) => d.studyMinutes));
  const stats = [
    { label: 'Productive hours', value: formatHours(week.productiveMinutes), hint: 'study + productive categories' },
    { label: 'Study hours', value: formatHours(week.studyMinutes), hint: `${formatDuration(week.studyMinutes / 7)} per day` },
    { label: 'Scheduled', value: formatHours(week.scheduledMinutes), hint: 'of 168h in the week' },
    { label: 'Unscheduled', value: formatHours(week.unscheduledMinutes), hint: 'time not in the timetable' },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Weekly analytics</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Calculated live from your timetable. Overlapping activities are only counted once.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Weekly totals">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{s.hint}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Hours by category" subtitle="Total weekly hours for every category in use.">
          <div style={{ height: Math.max(240, barData.length * 34 + 24) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid horizontal={false} stroke={grid} />
                <XAxis type="number" tick={{ fill: axis, fontSize: 11 }} tickLine={false} axisLine={false} unit="h" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={104}
                  tick={{ fill: axis, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: isDark ? '#ffffff0d' : '#0f172a0a' }} />
                <Bar dataKey="hours" name="Hours" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {barData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Time distribution" subtitle="Share of the 168 hours in a week.">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="92%"
                  paddingAngle={1}
                  stroke={isDark ? '#0f172a' : '#ffffff'}
                  strokeWidth={2}
                >
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {pieData.map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{d.name}</span>
                <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">{d.percent.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Daily study hours" subtitle="Study categories stacked per day, so you can compare how each day is loaded.">
        {studyCategories.length === 0 ? (
          <p className="text-sm text-slate-500">Mark a category as “Study” in the category manager to see this chart.</p>
        ) : (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStudy} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid vertical={false} stroke={grid} />
                  <XAxis dataKey="day" tick={{ fill: axis, fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: axis, fontSize: 11 }} tickLine={false} axisLine={false} unit="h" allowDecimals />
                  <Tooltip content={<ChartTooltip showTotal />} cursor={{ fill: isDark ? '#ffffff0d' : '#0f172a0a' }} />
                  {studyCategories.map((c, i) => (
                    <Bar
                      key={c.id}
                      dataKey={c.id}
                      name={c.name}
                      stackId="study"
                      fill={c.color}
                      radius={i === studyCategories.length - 1 ? [6, 6, 0, 0] : 0}
                      maxBarSize={44}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {studyCategories.map((c) => (
                <li key={c.id} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </li>
              ))}
            </ul>
          </>
        )}
        <ul className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-4">
          {week.days.map((d) => (
            <li key={d.day} className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{DAY_NAMES[d.day]}</span>
                <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                  {formatDuration(d.studyMinutes)}
                </span>
              </div>
              <ProgressBar
                className="mt-1.5 !h-1.5"
                value={maxStudyDay ? (d.studyMinutes / maxStudyDay) * 100 : 0}
                label={`${DAY_NAMES[d.day]} study time compared with the busiest day`}
              />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Category breakdown">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {week.totals.map((t) => (
            <li key={t.category.id} className="flex items-center gap-3 py-2.5">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: t.category.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{t.category.name}</p>
                <ProgressBar
                  className="mt-1 !h-1.5"
                  value={(t.minutes / week.totals[0].minutes) * 100}
                  color={t.category.color}
                  label={`${t.category.name} share`}
                />
              </div>
              <div className="w-20 shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{formatDuration(t.minutes)}</p>
                <p className="text-xs tabular-nums text-slate-400">{((t.minutes / weekMinutes) * 100).toFixed(1)}%</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
