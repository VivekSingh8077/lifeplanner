import { useMemo } from 'react';
import { effectiveTargets, metricsForProfile, type Metrics, type Targets } from '../lib/health';
import { keyFromDate, latestWeightEntry, sortedWeights } from '../lib/healthStats';
import { useApp } from '../store/AppContext';
import type { HealthData, HealthProfile, WeightEntry } from '../types';
import { useNow } from './useNow';

export interface HealthView {
  health: HealthData;
  profile: HealthProfile | null;
  /** Today's date key (updates at midnight). */
  today: string;
  /** Latest recorded weight (kg), falling back to the profile's weight. */
  currentKg: number | null;
  latestEntry: WeightEntry | null;
  /** Earliest recorded weight (kg), falling back to the profile's weight. */
  startKg: number | null;
  metrics: Metrics | null;
  targets: Targets | null;
  weightUnit: 'kg' | 'lb';
  heightUnit: 'cm' | 'ft';
}

/** Derived health values shared by the Health pages. */
export function useHealth(): HealthView {
  const { data } = useApp();
  const now = useNow(30_000);
  const today = keyFromDate(now);
  const health = data.health;
  const profile = health.profile;

  return useMemo(() => {
    const sorted = sortedWeights(health.weightEntries);
    const latestEntry = latestWeightEntry(health.weightEntries);
    const currentKg = latestEntry?.kg ?? profile?.currentWeightKg ?? null;
    const startKg = sorted[0]?.kg ?? profile?.currentWeightKg ?? null;
    const metrics = profile && currentKg !== null ? metricsForProfile(profile, currentKg) : null;
    const targets = profile && currentKg !== null ? effectiveTargets(profile, currentKg) : null;
    return {
      health,
      profile,
      today,
      currentKg,
      latestEntry,
      startKg,
      metrics,
      targets,
      weightUnit: profile?.weightUnit ?? 'kg',
      heightUnit: profile?.heightUnit ?? 'cm',
    };
  }, [health, profile, today]);
}
