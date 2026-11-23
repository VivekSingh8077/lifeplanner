import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { ProgressBar } from '../ui/ProgressBar';

/** Standing reminder shown on health pages. */
export function Disclaimer({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl bg-slate-100 p-3.5 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/70 dark:text-slate-400">
      <Info size={15} className="mt-0.5 shrink-0" />
      <p>
        {children ??
          'This is a personal wellness tracker, not a medical tool. Calorie, nutrition and exercise figures are estimates. Your data stays in this browser unless you export it.'}
      </p>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: ReactNode;
  color: string;
  /** 0-100; draws a progress bar when provided. */
  progress?: number;
  warn?: boolean;
}

export function StatCard({ label, value, sub, icon, color, progress, warn }: StatCardProps) {
  return (
    <div className="card flex flex-col p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1f`, color }}>
        {icon}
      </div>
      <p className="mt-3 text-xl font-semibold tabular-nums leading-tight text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      {progress !== undefined && <ProgressBar className="mt-2.5 !h-1.5" value={progress} color={warn ? '#f59e0b' : color} label={label} />}
      {sub && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

export function SectionTitle({ title, action, subtitle }: { title: string; action?: ReactNode; subtitle?: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Convert a validation error map into inline field text. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
      {message}
    </p>
  );
}

export const MACRO_COLORS = { protein: '#6366f1', carbs: '#f59e0b', fat: '#ec4899' } as const;
export const CHART_GRID = { light: '#e2e8f0', dark: '#1e293b' };
export const CHART_AXIS = { light: '#64748b', dark: '#94a3b8' };
