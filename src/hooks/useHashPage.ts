import { useCallback, useEffect, useState } from 'react';
import type { Page } from '../types';

/** Page -> URL hash. Health pages live under #/health/... */
const HASH_OF: Record<Page, string> = {
  dashboard: 'dashboard',
  timetable: 'timetable',
  analytics: 'analytics',
  goals: 'goals',
  settings: 'settings',
  health: 'health',
  'health-food': 'health/food',
  'health-weight': 'health/weight',
  'health-reports': 'health/reports',
  'health-profile': 'health/profile',
};

const PAGE_OF = new Map<string, Page>((Object.entries(HASH_OF) as [Page, string][]).map(([page, hash]) => [hash, page]));

function readHash(): Page {
  const raw = window.location.hash.replace(/^#\/?/, '').replace(/\/$/, '');
  return PAGE_OF.get(raw) ?? 'dashboard';
}

/** Tiny hash router so a refresh (or a bookmark) returns to the same page on any static host. */
export function useHashPage(): [Page, (page: Page) => void] {
  const [page, setPage] = useState<Page>(readHash);

  useEffect(() => {
    const onChange = () => setPage(readHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Page) => {
    window.location.hash = `/${HASH_OF[next]}`;
    window.scrollTo({ top: 0 });
  }, []);

  return [page, navigate];
}
