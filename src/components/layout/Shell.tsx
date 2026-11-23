import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  MoreHorizontal,
  Moon,
  Scale,
  Settings,
  Sun,
  Target,
  TriangleAlert,
  UserCog,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useApp } from '../../store/AppContext';
import type { Page } from '../../types';
import { Modal } from '../ui/Modal';

interface NavItem {
  page: Page;
  label: string;
  icon: LucideIcon;
}

const PLANNER_NAV: NavItem[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'timetable', label: 'Timetable', icon: CalendarDays },
  { page: 'analytics', label: 'Analytics', icon: BarChart3 },
  { page: 'goals', label: 'Weekly Goals', icon: Target },
];

export const HEALTH_NAV: NavItem[] = [
  { page: 'health', label: 'Overview', icon: HeartPulse },
  { page: 'health-food', label: 'Food Diary', icon: Utensils },
  { page: 'health-weight', label: 'Weight Tracker', icon: Scale },
  { page: 'health-reports', label: 'Reports', icon: ClipboardList },
  { page: 'health-profile', label: 'Health Profile & Settings', icon: UserCog },
];

const SETTINGS_NAV: NavItem = { page: 'settings', label: 'Settings', icon: Settings };

const isHealth = (page: Page) => page.startsWith('health');

interface ShellProps {
  page: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
        <CalendarClock size={20} />
      </div>
      <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">MyLife Planner</span>
    </div>
  );
}

function SidebarButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
      }`}
    >
      <Icon size={19} className="shrink-0" />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

export function Shell({ page, onNavigate, children }: ShellProps) {
  const { actions, isDark, storageOk } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);

  const toggleTheme = () => actions.setTheme(isDark ? 'light' : 'dark');

  const mobileTabs: { key: string; label: string; icon: LucideIcon; active: boolean; onClick: () => void }[] = [
    { key: 'dashboard', label: 'Home', icon: LayoutDashboard, active: page === 'dashboard', onClick: () => onNavigate('dashboard') },
    { key: 'timetable', label: 'Timetable', icon: CalendarDays, active: page === 'timetable', onClick: () => onNavigate('timetable') },
    { key: 'health', label: 'Health', icon: HeartPulse, active: isHealth(page), onClick: () => onNavigate('health') },
    { key: 'goals', label: 'Goals', icon: Target, active: page === 'goals', onClick: () => onNavigate('goals') },
    { key: 'more', label: 'More', icon: MoreHorizontal, active: page === 'analytics' || page === 'settings', onClick: () => setMoreOpen(true) },
  ];

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Main">
          {PLANNER_NAV.map((item) => (
            <SidebarButton key={item.page} item={item} active={item.page === page} onClick={() => onNavigate(item.page)} />
          ))}

          <p className="mb-1 mt-5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Health &amp; Fitness
          </p>
          {HEALTH_NAV.map((item) => (
            <SidebarButton key={item.page} item={item} active={item.page === page} onClick={() => onNavigate(item.page)} />
          ))}

          <div className="mt-5">
            <SidebarButton item={SETTINGS_NAV} active={page === 'settings'} onClick={() => onNavigate('settings')} />
          </div>
        </nav>
        <button type="button" onClick={toggleTheme} className="btn btn-ghost justify-start px-3">
          {isDark ? <Sun size={19} /> : <Moon size={19} />}
          {isDark ? 'Light theme' : 'Dark theme'}
        </button>
      </aside>

      {/* Mobile compact header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 lg:hidden">
        <Logo />
        <button type="button" className="btn-icon -mr-2" onClick={toggleTheme} aria-label="Toggle theme">
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
        {!storageOk && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <p>
              Your browser is blocking local storage (private mode?), so changes will be lost when you close this tab. Use
              Settings → Export to keep a copy.
            </p>
          </div>
        )}
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
        aria-label="Main"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {mobileTabs.map(({ key, label, icon: Icon, active, onClick }) => (
            <button
              key={key}
              type="button"
              onClick={onClick}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.4 : 2} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {moreOpen && (
        <Modal title="More" onClose={() => setMoreOpen(false)}>
          <div className="space-y-2">
            {[PLANNER_NAV[2], SETTINGS_NAV].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.page}
                  type="button"
                  className="flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-slate-200 px-4 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                  onClick={() => {
                    setMoreOpen(false);
                    onNavigate(item.page);
                  }}
                >
                  <Icon size={20} className="text-indigo-600 dark:text-indigo-400" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}
