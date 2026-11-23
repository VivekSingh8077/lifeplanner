import { ClipboardList, HeartPulse, Scale, UserCog, Utensils } from 'lucide-react';
import type { HealthPage, Page } from '../../types';

const TABS: { page: HealthPage; label: string; icon: typeof HeartPulse }[] = [
  { page: 'health', label: 'Overview', icon: HeartPulse },
  { page: 'health-food', label: 'Food', icon: Utensils },
  { page: 'health-weight', label: 'Weight', icon: Scale },
  { page: 'health-reports', label: 'Reports', icon: ClipboardList },
  { page: 'health-profile', label: 'Profile', icon: UserCog },
];

/** Section tabs for the Health pages on phones (desktop uses the sidebar). */
export function HealthTabs({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  return (
    <nav className="grid grid-cols-5 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800 lg:hidden" aria-label="Health & Fitness">
      {TABS.map(({ page: p, label, icon: Icon }) => {
        const active = p === page;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onNavigate(p)}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition-colors ${
              active
                ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
