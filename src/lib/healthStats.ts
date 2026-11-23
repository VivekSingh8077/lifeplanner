import type { ExerciseEntry, HealthData, MealEntry, MealType, WaterEntry, WeightEntry } from '../types';
import { round1, round2 } from './health';

/* ------------------------------------------------------------------ */
/* Date helpers (YYYY-MM-DD keys, local time)                          */
/* ------------------------------------------------------------------ */

const pad = (n: number) => n.toString().padStart(2, '0');

export function keyFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + n);
  return keyFromDate(d);
}

/** Inclusive list of date keys. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to && out.length < 800; k = addDays(k, 1)) out.push(k);
  return out;
}

export function weekStartKey(key: string): string {
  const d = dateFromKey(key);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return keyFromDate(d);
}

export function formatShortDate(key: string): string {
  return dateFromKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function formatDateLong(key: string): string {
  return dateFromKey(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/* Daily totals                                                        */
/* ------------------------------------------------------------------ */

export interface DayNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  byMeal: Record<MealType, number>;
  entries: number;
}

export const EMPTY_MEALS: Record<MealType, number> = { breakfast: 0, lunch: 0, evening: 0, dinner: 0, other: 0 };

export function nutritionForEntries(entries: MealEntry[]): DayNutrition {
  const t: DayNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, byMeal: { ...EMPTY_MEALS }, entries: entries.length };
  for (const e of entries) {
    t.calories += e.calories;
    t.protein += e.protein;
    t.carbs += e.carbs;
    t.fat += e.fat;
    t.byMeal[e.meal] += e.calories;
  }
  t.calories = Math.round(t.calories);
  t.protein = round1(t.protein);
  t.carbs = round1(t.carbs);
  t.fat = round1(t.fat);
  return t;
}

export const mealsOn = (health: HealthData, date: string) => health.mealEntries.filter((e) => e.date === date);
export const waterOn = (entries: WaterEntry[], date: string) => entries.filter((e) => e.date === date).reduce((n, e) => n + e.ml, 0);

export function exerciseOn(entries: ExerciseEntry[], date: string): { sessions: number; minutes: number; calories: number } {
  const list = entries.filter((e) => e.date === date);
  return {
    sessions: list.length,
    minutes: list.reduce((n, e) => n + e.minutes, 0),
    calories: list.reduce((n, e) => n + (e.caloriesBurned ?? 0), 0),
  };
}

/* ------------------------------------------------------------------ */
/* Weight                                                              */
/* ------------------------------------------------------------------ */

export function sortedWeights(entries: WeightEntry[]): WeightEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

export function latestWeightEntry(entries: WeightEntry[]): WeightEntry | null {
  const s = sortedWeights(entries);
  return s.length ? s[s.length - 1] : null;
}

export interface WeightPoint {
  date: string;
  kg: number;
  /** Average of all entries in the 7 days ending on this date. */
  avg7: number;
}

/** Daily weights with a trailing 7-day average, which smooths out normal day-to-day swings. */
export function weightSeries(entries: WeightEntry[]): WeightPoint[] {
  const sorted = sortedWeights(entries);
  return sorted.map((e) => {
    const from = addDays(e.date, -6);
    const window = sorted.filter((w) => w.date >= from && w.date <= e.date);
    const avg = window.reduce((n, w) => n + w.kg, 0) / window.length;
    return { date: e.date, kg: e.kg, avg7: round2(avg) };
  });
}

export interface PeriodAverage {
  key: string;
  label: string;
  avg: number;
  count: number;
}

function groupAverage(entries: WeightEntry[], keyOf: (date: string) => string, labelOf: (key: string) => string): PeriodAverage[] {
  const groups = new Map<string, number[]>();
  for (const e of sortedWeights(entries)) {
    const k = keyOf(e.date);
    groups.set(k, [...(groups.get(k) ?? []), e.kg]);
  }
  return [...groups.entries()].map(([key, list]) => ({
    key,
    label: labelOf(key),
    avg: round2(list.reduce((n, v) => n + v, 0) / list.length),
    count: list.length,
  }));
}

export const weeklyAverages = (entries: WeightEntry[]) =>
  groupAverage(entries, weekStartKey, (k) => `Week of ${formatShortDate(k)}`);

export const monthlyAverages = (entries: WeightEntry[]) =>
  groupAverage(
    entries,
    (d) => d.slice(0, 7),
    (k) => dateFromKey(`${k}-01`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
  );

/** Average weight over the last `days` days up to `todayKey`; null if there are no entries. */
export function averageWeightLast(entries: WeightEntry[], todayKey: string, days: number): number | null {
  const from = addDays(todayKey, -(days - 1));
  const list = entries.filter((e) => e.date >= from && e.date <= todayKey);
  if (!list.length) return null;
  return round2(list.reduce((n, e) => n + e.kg, 0) / list.length);
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export interface DailyPoint {
  date: string;
  calories: number;
  protein: number;
  logged: boolean;
}

export interface PeriodReport {
  from: string;
  to: string;
  days: number;
  /** Days with at least one food entry. */
  loggedDays: number;
  avgCalories: number | null;
  avgProtein: number | null;
  avgWaterMl: number | null;
  waterDays: number;
  exerciseDays: number;
  exerciseSessions: number;
  exerciseMinutes: number;
  /** Average calories per logged day, per meal. */
  mealAverages: Record<MealType, number>;
  daily: DailyPoint[];
  weight: {
    startAvg: number | null;
    endAvg: number | null;
    change: number | null;
    entries: number;
    windowDays: number;
  };
}

export function buildReport(health: HealthData, from: string, to: string): PeriodReport {
  const keys = dateRange(from, to);
  const daily: DailyPoint[] = [];
  const mealTotals: Record<MealType, number> = { ...EMPTY_MEALS };
  let loggedDays = 0;
  let calSum = 0;
  let proSum = 0;
  let waterSum = 0;
  let waterDays = 0;
  let exerciseDays = 0;
  let sessions = 0;
  let minutes = 0;

  for (const k of keys) {
    const n = nutritionForEntries(mealsOn(health, k));
    const logged = n.entries > 0;
    daily.push({ date: k, calories: n.calories, protein: n.protein, logged });
    if (logged) {
      loggedDays++;
      calSum += n.calories;
      proSum += n.protein;
      for (const m of Object.keys(mealTotals) as MealType[]) mealTotals[m] += n.byMeal[m];
    }
    const w = waterOn(health.waterEntries, k);
    if (w > 0) {
      waterSum += w;
      waterDays++;
    }
    const ex = exerciseOn(health.exerciseEntries, k);
    if (ex.sessions > 0) {
      exerciseDays++;
      sessions += ex.sessions;
      minutes += ex.minutes;
    }
  }

  const mealAverages = { ...EMPTY_MEALS };
  for (const m of Object.keys(mealAverages) as MealType[]) {
    mealAverages[m] = loggedDays ? Math.round(mealTotals[m] / loggedDays) : 0;
  }

  // Weight change uses the average of the first and last few days, never single readings.
  const inRange = sortedWeights(health.weightEntries).filter((w) => w.date >= from && w.date <= to);
  const windowDays = Math.max(1, Math.min(7, Math.floor(keys.length / 2)));
  const startEntries = inRange.filter((w) => w.date <= addDays(from, windowDays - 1));
  const endEntries = inRange.filter((w) => w.date >= addDays(to, -(windowDays - 1)));
  const avgOf = (list: WeightEntry[]) => (list.length ? round2(list.reduce((n, w) => n + w.kg, 0) / list.length) : null);
  const startAvg = avgOf(startEntries);
  const endAvg = avgOf(endEntries);
  const distinct = startEntries.length > 0 && endEntries.length > 0 && inRange.length >= 2 && startEntries[0].id !== endEntries[endEntries.length - 1].id;

  return {
    from,
    to,
    days: keys.length,
    loggedDays,
    avgCalories: loggedDays ? Math.round(calSum / loggedDays) : null,
    avgProtein: loggedDays ? round1(proSum / loggedDays) : null,
    avgWaterMl: waterDays ? Math.round(waterSum / waterDays) : null,
    waterDays,
    exerciseDays,
    exerciseSessions: sessions,
    exerciseMinutes: minutes,
    mealAverages,
    daily,
    weight: {
      startAvg,
      endAvg,
      change: distinct && startAvg !== null && endAvg !== null ? round2(endAvg - startAvg) : null,
      entries: inRange.length,
      windowDays,
    },
  };
}
