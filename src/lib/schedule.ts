import type { Activity, Category, DayId, Timetable } from '../types';
import { nextDay, previousDay } from './dates';
import { MINUTES_IN_DAY, parseTime } from './time';

/**
 * A piece of an activity as it falls on a single calendar day.
 * `start`/`end` are minutes since midnight of that day (end <= 1440).
 * An activity that runs past midnight (e.g. Sleep 23:30 -> 06:30) produces
 * one segment on its own day and a `carryOver` segment on the following day.
 */
export interface Segment {
  activity: Activity;
  start: number;
  end: number;
  carryOver: boolean;
}

export const UNCATEGORISED: Category = {
  id: 'uncategorised',
  name: 'Uncategorised',
  color: '#94a3b8',
  kind: 'other',
};

export function categoryMap(categories: Category[]): Map<string, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}

export function getCategory(map: Map<string, Category>, id: string): Category {
  return map.get(id) ?? UNCATEGORISED;
}

/** Absolute range of an activity; `end` may exceed 1440 when it crosses midnight. */
export function activityRange(a: Pick<Activity, 'start' | 'end'>): { start: number; end: number } | null {
  const s = parseTime(a.start);
  const e = parseTime(a.end);
  if (s === null || e === null || s === e) return null;
  return { start: s, end: e > s ? e : e + MINUTES_IN_DAY };
}

export function activityMinutes(a: Pick<Activity, 'start' | 'end'>): number {
  const r = activityRange(a);
  return r ? r.end - r.start : 0;
}

export function crossesMidnight(a: Pick<Activity, 'start' | 'end'>): boolean {
  const r = activityRange(a);
  return !!r && r.end > MINUTES_IN_DAY;
}

/** All segments on `day`, sorted by start time. */
export function daySegments(tt: Timetable, day: DayId, includeCarryOver = true): Segment[] {
  const segs: Segment[] = [];
  for (const activity of tt[day]) {
    const r = activityRange(activity);
    if (!r) continue;
    segs.push({ activity, start: r.start, end: Math.min(r.end, MINUTES_IN_DAY), carryOver: false });
  }
  if (includeCarryOver) {
    for (const activity of tt[previousDay(day)]) {
      const r = activityRange(activity);
      if (r && r.end > MINUTES_IN_DAY) {
        segs.push({ activity, start: 0, end: r.end - MINUTES_IN_DAY, carryOver: true });
      }
    }
  }
  return segs.sort((a, b) => a.start - b.start || a.end - b.end);
}

/** The segment that is happening at `nowMin` on `day`, if any. */
export function findCurrent(tt: Timetable, day: DayId, nowMin: number): Segment | null {
  const active = daySegments(tt, day).filter((s) => s.start <= nowMin && nowMin < s.end);
  if (active.length === 0) return null;
  // Prefer the one that started most recently (a real activity over a carry-over tail).
  return active.sort((a, b) => b.start - a.start)[0];
}

export interface NextInfo {
  segment: Segment;
  /** The day the next activity starts on. */
  day: DayId;
  /** 0 = later today, 1 = tomorrow, ... (looks up to a week ahead). */
  daysAhead: number;
  minutesUntil: number;
}

/**
 * The next activity that STARTS after `nowMin`, rolling into the following days if needed.
 * Carry-over segments (the part of an overnight activity that falls after midnight) are
 * continuations, not starts, so they are never reported as "next".
 */
export function findNext(tt: Timetable, day: DayId, nowMin: number): NextInfo | null {
  const today = daySegments(tt, day, false).find((s) => s.start > nowMin);
  if (today) return { segment: today, day, daysAhead: 0, minutesUntil: today.start - nowMin };
  let d = day;
  for (let offset = 1; offset <= 7; offset++) {
    d = nextDay(d);
    const first = daySegments(tt, d, false)[0];
    if (first) {
      return { segment: first, day: d, daysAhead: offset, minutesUntil: offset * MINUTES_IN_DAY - nowMin + first.start };
    }
  }
  return null;
}

export interface ActivityDraft {
  name: string;
  categoryId: string;
  start: string;
  end: string;
}

/** Blocking problems with an activity. Empty array means valid. */
export function validateActivity(draft: ActivityDraft, categories: Category[]): string[] {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push('Give the activity a name.');
  if (!categories.some((c) => c.id === draft.categoryId)) errors.push('Choose a category.');
  const s = parseTime(draft.start);
  const e = parseTime(draft.end);
  if (s === null) errors.push('Start time is not valid.');
  if (e === null) errors.push('End time is not valid.');
  if (s !== null && e !== null && s === e) errors.push('Start and end time cannot be the same.');
  return errors;
}

/**
 * Map of activity id -> ids of other activities it overlaps with.
 * Takes midnight crossings into account (Sleep ending at 06:30 versus an
 * activity starting at 06:00 the next day).
 */
export function findConflicts(tt: Timetable, days: DayId[] = [0, 1, 2, 3, 4, 5, 6]): Map<string, Set<string>> {
  const conflicts = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!conflicts.has(a)) conflicts.set(a, new Set());
    conflicts.get(a)!.add(b);
  };
  for (const day of days) {
    const segs = daySegments(tt, day);
    for (let i = 0; i < segs.length; i++) {
      for (let j = i + 1; j < segs.length; j++) {
        const a = segs[i];
        const b = segs[j];
        if (a.activity.id === b.activity.id) continue;
        if (a.start < b.end && b.start < a.end) {
          link(a.activity.id, b.activity.id);
          link(b.activity.id, a.activity.id);
        }
      }
    }
  }
  return conflicts;
}

/** Activities that would overlap with `candidate` if it were saved on `day`. */
export function conflictsForCandidate(tt: Timetable, day: DayId, candidate: Activity): Activity[] {
  const without = tt[day].filter((a) => a.id !== candidate.id);
  const trial: Timetable = { ...tt, [day]: [...without, candidate] };
  const ids = findConflicts(trial, [day, nextDay(day)]).get(candidate.id);
  if (!ids) return [];
  const all = [...without, ...tt[nextDay(day)], ...tt[previousDay(day)]];
  const seen = new Set<string>();
  return all.filter((a) => ids.has(a.id) && !seen.has(a.id) && !!seen.add(a.id));
}

/** Activities on a day sorted by start time (handles invalid times by sinking them to the end). */
export function sortedActivities(list: Activity[]): Activity[] {
  return [...list].sort((a, b) => {
    const sa = parseTime(a.start) ?? Number.MAX_SAFE_INTEGER;
    const sb = parseTime(b.start) ?? Number.MAX_SAFE_INTEGER;
    return sa - sb;
  });
}
