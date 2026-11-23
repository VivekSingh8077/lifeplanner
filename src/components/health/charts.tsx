import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { weightToDisplay } from '../../lib/health';
import { formatShortDate } from '../../lib/healthStats';
import { useApp } from '../../store/AppContext';
import { CHART_AXIS, CHART_GRID } from './shared';

function useChartColors() {
  const { isDark } = useApp();
  return { grid: isDark ? CHART_GRID.dark : CHART_GRID.light, axis: isDark ? CHART_AXIS.dark : CHART_AXIS.light };
}

interface TipRow {
  name?: string | number;
  value?: number | string;
  color?: string;
}

function Tip({ active, payload, label, unit, labelFormatter }: { active?: boolean; payload?: TipRow[]; label?: string | number; unit: string; labelFormatter?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value !== undefined && p.value !== null);
  if (!rows.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1 font-semibold text-slate-900 dark:text-white">{labelFormatter ? labelFormatter(String(label)) : label}</p>
      {rows.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-medium tabular-nums">{p.value} {unit}</span>
        </p>
      ))}
    </div>
  );
}

export interface CalorieDatum {
  date: string;
  calories: number;
  logged: boolean;
}

/** Daily calories as bars with the daily target as a dashed line. Days with nothing logged show no bar. */
export function CalorieChart({ data, target, height = 220 }: { data: CalorieDatum[]; target: number | null; height?: number }) {
  const c = useChartColors();
  const rows = data.map((d) => ({ ...d, kcal: d.logged ? d.calories : null }));
  const dense = data.length > 14;
  return (
    <div style={{ height }} role="img" aria-label="Daily calories chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} interval={dense ? 'preserveStartEnd' : 'equidistantPreserveStart'} minTickGap={24} />
          <YAxis tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: c.grid, opacity: 0.4 }} content={<Tip unit="kcal" labelFormatter={formatShortDate} />} />
          {target !== null && <ReferenceLine y={target} stroke="#f59e0b" strokeDasharray="5 4" />}
          <Bar dataKey="kcal" name="Calories" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface WeightDatum {
  key: string;
  label: string;
  kg: number | null;
  avg: number | null;
}

/** Weight line with an optional smoothed (average) line and target line. Values are shown in the user's unit. */
export function WeightChart({ data, unit, targetKg, height = 260, showPoints = true, rawName = 'Weight', avgName = '7-day average' }: { data: WeightDatum[]; unit: 'kg' | 'lb'; targetKg: number | null; height?: number; showPoints?: boolean; rawName?: string; avgName?: string }) {
  const c = useChartColors();
  const rows = data.map((d) => ({
    key: d.key,
    label: d.label,
    raw: d.kg === null ? null : weightToDisplay(d.kg, unit),
    avg: d.avg === null ? null : weightToDisplay(d.avg, unit),
  }));
  const target = targetKg === null ? null : weightToDisplay(targetKg, unit);
  const values = rows.flatMap((r) => [r.raw, r.avg]).filter((v): v is number => v !== null);
  if (target !== null) values.push(target);
  const lo = values.length ? Math.floor(Math.min(...values) - 1) : 0;
  const hi = values.length ? Math.ceil(Math.max(...values) + 1) : 1;
  return (
    <div style={{ height }} role="img" aria-label="Weight chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis domain={[lo, hi]} tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip content={<Tip unit={unit} />} />
          {target !== null && <ReferenceLine y={target} stroke="#10b981" strokeDasharray="5 4" label={{ value: 'Target', fill: '#10b981', fontSize: 11, position: 'insideTopRight' }} />}
          <Line type="monotone" dataKey="raw" name={rawName} stroke="#94a3b8" strokeWidth={1.5} dot={showPoints ? { r: 3 } : false} activeDot={{ r: 5 }} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="avg" name={avgName} stroke="#6366f1" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
