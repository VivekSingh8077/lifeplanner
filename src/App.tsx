import { lazy, Suspense } from 'react';
import { Shell } from './components/layout/Shell';
import { useHashPage } from './hooks/useHashPage';
import { DashboardPage } from './pages/DashboardPage';
import { GoalsPage } from './pages/GoalsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TimetablePage } from './pages/TimetablePage';

// Charts (Recharts) are only needed on the Analytics page, so load them on demand.
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const HealthOverviewPage = lazy(() => import('./pages/health/HealthOverviewPage').then((m) => ({ default: m.HealthOverviewPage })));
const FoodDiaryPage = lazy(() => import('./pages/health/FoodDiaryPage').then((m) => ({ default: m.FoodDiaryPage })));
const WeightTrackerPage = lazy(() => import('./pages/health/WeightTrackerPage').then((m) => ({ default: m.WeightTrackerPage })));
const ReportsPage = lazy(() => import('./pages/health/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const HealthProfilePage = lazy(() => import('./pages/health/HealthProfilePage').then((m) => ({ default: m.HealthProfilePage })));

export default function App() {
  const [page, navigate] = useHashPage();

  return (
    <Shell page={page} onNavigate={navigate}>
      {page === 'dashboard' && <DashboardPage onNavigate={navigate} />}
      {page === 'timetable' && <TimetablePage />}
      {page === 'analytics' && (
        <Suspense fallback={<p className="py-10 text-center text-sm text-slate-500">Loading analytics…</p>}>
          <AnalyticsPage />
        </Suspense>
      )}
      {page.startsWith('health') && (
        <Suspense fallback={<p className="py-10 text-center text-sm text-slate-500">Loading…</p>}>
          {page === 'health' && <HealthOverviewPage onNavigate={navigate} />}
          {page === 'health-food' && <FoodDiaryPage onNavigate={navigate} />}
          {page === 'health-weight' && <WeightTrackerPage onNavigate={navigate} />}
          {page === 'health-reports' && <ReportsPage onNavigate={navigate} />}
          {page === 'health-profile' && <HealthProfilePage onNavigate={navigate} />}
        </Suspense>
      )}
      {page === 'goals' && <GoalsPage />}
      {page === 'settings' && <SettingsPage />}
    </Shell>
  );
}
