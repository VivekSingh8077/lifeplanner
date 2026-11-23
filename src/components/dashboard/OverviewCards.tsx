import { BookOpen, Code2, GraduationCap, Languages, Binary, Youtube, type LucideIcon } from 'lucide-react';
import { formatDuration } from '../../lib/time';
import type { Category } from '../../types';

interface OverviewCardsProps {
  /** Minutes per category id for the selected day. */
  minutes: Record<string, number>;
  categories: Category[];
  studyMinutes: number;
}

interface CardSpec {
  key: string;
  label: string;
  icon: LucideIcon;
  minutes: number;
  color: string;
}

export function OverviewCards({ minutes, categories, studyMinutes }: OverviewCardsProps) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const colorOf = (id: string, fallback: string) => byId.get(id)?.color ?? fallback;
  const specs: CardSpec[] = [
    { key: 'study', label: 'Total study', icon: BookOpen, minutes: studyMinutes, color: '#6366f1' },
    { key: 'dsa', label: 'DSA', icon: Binary, minutes: minutes.dsa ?? 0, color: colorOf('dsa', '#3b82f6') },
    { key: 'development', label: 'Development', icon: Code2, minutes: minutes.development ?? 0, color: colorOf('development', '#6366f1') },
    { key: 'academics', label: 'Academics', icon: GraduationCap, minutes: minutes.academics ?? 0, color: colorOf('academics', '#22c55e') },
    { key: 'japanese', label: 'Japanese', icon: Languages, minutes: minutes.japanese ?? 0, color: colorOf('japanese', '#a855f7') },
    { key: 'youtube', label: 'YouTube', icon: Youtube, minutes: minutes.youtube ?? 0, color: colorOf('youtube', '#ef4444') },
  ];

  return (
    <section aria-label="Daily overview" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {specs.map(({ key, label, icon: Icon, minutes: m, color }) => (
        <div key={key} className="card p-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}1f`, color }}
          >
            <Icon size={18} />
          </div>
          <p className="mt-3 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{formatDuration(m)}</p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      ))}
    </section>
  );
}
