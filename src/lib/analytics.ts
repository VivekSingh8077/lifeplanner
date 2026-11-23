import type { Category, DayId, Timetable } from '../types';
import { DAY_IDS } from './dates';
import { MINUTES_IN_DAY } from './time';
import { activityRange, categoryMap, getCategory } from './schedule';

export interface DayAnalytics {
  day: DayId;
  byCategory: Record<string, number>;
  scheduledMinutes: number;
  studyMinutes: number;
  productiveMinutes: number;
}

export interface CategoryTotal {
  category: Category;
  minutes: number;
}

export interface WeekAnalytics {
  days: DayAnalytics[];
  totals: CategoryTotal[];
  scheduledMinutes: number;
  unscheduledMinutes: number;
  studyMinutes: number;
  productiveMinutes: number;
}

const WEEK_MINUTES = 7 * MINUTES_IN_DAY;

/**
 * Minutes per category for each day, attributed to the day an activity STARTS on.
 *
 * - An overnight activity (Sleep 23:30 -> 06:30) is counted in full on the day it starts,
 *   so a week's totals are exactly the activities defined in that week: nothing is borrowed
 *   from the preceding Sunday and every activity is counted once.
 * - Overlapping activities are never double counted. Each minute of the (wrapping) week is
 *   claimed by the earliest-starting activity that covers it.
 */
export function weekMinutesByDay(tt: Timetable): Record<DayId, Record<string, number>> {
  const result = {} as Record<DayId, Record<string, number>>;
  for (const d of DAY_IDS) result[d] = {};

  const items: { day: DayId; categoryId: string; abs: number; len: number }[] = [];
  for (const day of DAY_IDS) {
    for (const a of tt[day]) {
      const r = activityRange(a);
      if (!r) continue;
      items.push({ day, categoryId: a.categoryId, abs: day * MINUTES_IN_DAY + r.start, len: r.end - r.start });
    }
  }
  items.sort((x, y) => x.abs - y.abs || x.len - y.len);

  const claimed = new Uint8Array(WEEK_MINUTES);
  for (const it of items) {
    let count = 0;
    for (let i = 0; i < it.len; i++) {
      const idx = (it.abs + i) % WEEK_MINUTES;
      if (!claimed[idx]) {
        claimed[idx] = 1;
        count++;
      }
    }
    if (count > 0) result[it.day][it.categoryId] = (result[it.day][it.categoryId] ?? 0) + count;
  }
  return result;
}

export function dayMinutesByCategory(tt: Timetable, day: DayId): Record<string, number> {
  return weekMinutesByDay(tt)[day];
}

function summariseDay(day: DayId, byCategory: Record<string, number>, categories: Category[]): DayAnalytics {
  const map = categoryMap(categories);
  let scheduled = 0;
  let study = 0;
  let productive = 0;
  for (const [id, minutes] of Object.entries(byCategory)) {
    const kind = getCategory(map, id).kind;
    scheduled += minutes;
    if (kind === 'study') {
      study += minutes;
      productive += minutes;
    } else if (kind === 'productive') {
      productive += minutes;
    }
  }
  return { day, byCategory, scheduledMinutes: scheduled, studyMinutes: study, productiveMinutes: productive };
}

/** Everything below is derived from the timetable; nothing is hardcoded. */
export function analyzeDay(tt: Timetable, day: DayId, categories: Category[]): DayAnalytics {
  return summariseDay(day, weekMinutesByDay(tt)[day], categories);
}

export function analyzeWeek(tt: Timetable, categories: Category[]): WeekAnalytics {
  const map = categoryMap(categories);
  const byDay = weekMinutesByDay(tt);
  const days = DAY_IDS.map((d) => summariseDay(d, byDay[d], categories));

  const sums: Record<string, number> = {};
  for (const d of days) {
    for (const [id, minutes] of Object.entries(d.byCategory)) {
      sums[id] = (sums[id] ?? 0) + minutes;
    }
  }

  const totals: CategoryTotal[] = Object.entries(sums)
    .map(([id, minutes]) => ({ category: getCategory(map, id), minutes }))
    .filter((t) => t.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  const scheduledMinutes = days.reduce((n, d) => n + d.scheduledMinutes, 0);
  return {
    days,
    totals,
    scheduledMinutes,
    unscheduledMinutes: Math.max(0, WEEK_MINUTES - scheduledMinutes),
    studyMinutes: days.reduce((n, d) => n + d.studyMinutes, 0),
    productiveMinutes: days.reduce((n, d) => n + d.productiveMinutes, 0),
  };
}
