import { describe, expect, it } from 'vitest';
import { createDefaultData } from '../data/defaults';
import type { Activity, DayId, Timetable } from '../types';
import { analyzeDay, analyzeWeek, weekMinutesByDay } from './analytics';
import {
  activityMinutes,
  conflictsForCandidate,
  crossesMidnight,
  daySegments,
  findConflicts,
  findCurrent,
  findNext,
  validateActivity,
} from './schedule';
import { parseTime } from './time';

const min = (hhmm: string) => parseTime(hhmm)!;
const act = (id: string, start: string, end: string, categoryId = 'dsa', name = id): Activity => ({ id, name, categoryId, start, end });
const empty = (): Timetable => ({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });
const defaults = () => createDefaultData();

describe('time ranges', () => {
  it('computes durations including overnight activities', () => {
    expect(activityMinutes(act('a', '06:45', '08:00'))).toBe(75);
    expect(activityMinutes(act('s', '23:30', '06:30'))).toBe(420);
    expect(activityMinutes(act('o', '20:45', '00:00'))).toBe(195);
    expect(crossesMidnight(act('s', '23:30', '06:30'))).toBe(true);
    expect(crossesMidnight(act('o', '20:45', '00:00'))).toBe(false); // ends exactly at midnight
  });

  it('treats equal or invalid times as zero length', () => {
    expect(activityMinutes(act('x', '10:00', '10:00'))).toBe(0);
    expect(activityMinutes(act('x', '25:00', '10:00'))).toBe(0);
    expect(activityMinutes(act('x', 'abc', '10:00'))).toBe(0);
  });
});

describe('findCurrent / findNext with overnight activities', () => {
  const tt = defaults().timetable;

  it('finds the current activity', () => {
    expect(findCurrent(tt, 0, min('06:50'))?.activity.name).toBe('DSA / Placement preparation');
    expect(findCurrent(tt, 0, min('09:20'))).toBeNull(); // gap between commute and college
  });

  it("returns Monday's Sleep as a carry-over on Tuesday morning", () => {
    const cur = findCurrent(tt, 1, min('02:00'));
    expect(cur?.activity.name).toBe('Sleep');
    expect(cur?.carryOver).toBe(true);
  });

  it('next activity is the next real start, with the real time and a day offset', () => {
    const next = findNext(tt, 0, min('06:50'));
    expect(next?.segment.activity.name).toBe('Breakfast');
    expect(next?.minutesUntil).toBe(70);
    expect(next?.daysAhead).toBe(0);
  });

  it('never reports the tail of an overnight activity (which would read "12:00 AM") as next', () => {
    // Monday 23:45: asleep since 23:30. Next START is Tuesday 06:30, not a 00:00 sleep continuation.
    const next = findNext(tt, 0, min('23:45'));
    expect(next?.segment.activity.name).toBe('Wake up and freshen up');
    expect(next?.segment.carryOver).toBe(false);
    expect(next?.segment.start).toBe(min('06:30'));
    expect(next?.daysAhead).toBe(1);
    expect(next?.minutesUntil).toBe(15 + 6 * 60 + 30);
  });

  it('from the early hours the next start is later the same day', () => {
    const next = findNext(tt, 1, min('02:00'));
    expect(next?.segment.activity.name).toBe('Wake up and freshen up');
    expect(next?.daysAhead).toBe(0);
    expect(next?.minutesUntil).toBe(4 * 60 + 30);
  });

  it('looks several days ahead when the following days are empty', () => {
    const t = empty();
    t[3] = [act('thu', '09:00', '10:00')];
    const next = findNext(t, 0 as DayId, min('12:00'));
    expect(next?.segment.activity.id).toBe('thu');
    expect(next?.daysAhead).toBe(3);
    expect(next?.minutesUntil).toBe(3 * 1440 - min('12:00') + min('09:00'));
  });

  it('returns null for a completely empty timetable', () => {
    expect(findNext(empty(), 2, 600)).toBeNull();
    expect(findCurrent(empty(), 2, 600)).toBeNull();
  });
});

describe('daySegments', () => {
  it('splits an overnight activity into a start segment and a carry-over', () => {
    const t = empty();
    t[0] = [act('sleep', '23:30', '06:30', 'sleep')];
    const mon = daySegments(t, 0);
    const tue = daySegments(t, 1);
    expect(mon).toHaveLength(1);
    expect(mon[0]).toMatchObject({ start: min('23:30'), end: 1440, carryOver: false });
    expect(tue).toHaveLength(1);
    expect(tue[0]).toMatchObject({ start: 0, end: min('06:30'), carryOver: true });
  });

  it('wraps Sunday night into Monday morning', () => {
    const t = empty();
    t[6] = [act('sleep', '23:00', '07:00', 'sleep')];
    expect(daySegments(t, 0)[0]).toMatchObject({ carryOver: true, end: min('07:00') });
  });
});

describe('weekly analytics', () => {
  it('counts an overnight activity once, on the day it starts (no carry-over from the preceding Sunday)', () => {
    const t = empty();
    t[6] = [act('sunSleep', '23:00', '07:00', 'sleep')]; // Sunday night -> Monday morning
    const byDay = weekMinutesByDay(t);
    expect(byDay[6].sleep).toBe(8 * 60);
    expect(byDay[0].sleep).toBeUndefined(); // Monday does not borrow Sunday's sleep
    const week = analyzeWeek(t, defaults().categories);
    expect(week.totals.find((x) => x.category.id === 'sleep')?.minutes).toBe(8 * 60);
    expect(week.scheduledMinutes).toBe(8 * 60);
  });

  it('week total equals the sum of activity durations when nothing overlaps', () => {
    const d = defaults();
    const sum = Object.values(d.timetable)
      .flat()
      .reduce((n, a) => n + activityMinutes(a), 0);
    const week = analyzeWeek(d.timetable, d.categories);
    expect(week.scheduledMinutes).toBe(sum);
    expect(week.scheduledMinutes + week.unscheduledMinutes).toBe(7 * 1440);
  });

  it('matches hand-calculated values for the default schedule', () => {
    const d = defaults();
    const week = analyzeWeek(d.timetable, d.categories);
    const hours = (id: string) => (week.totals.find((t) => t.category.id === id)?.minutes ?? 0) / 60;
    expect(hours('dsa')).toBe(9.75); // 5 x 1.25 + 2 + 1.5
    expect(hours('sleep')).toBe(35); // 5 nights x 7h
    expect(hours('college')).toBe(37.5);
    expect(analyzeDay(d.timetable, 1, d.categories).studyMinutes).toBe(225); // Tuesday 3.75h
    expect(analyzeDay(d.timetable, 5, d.categories).studyMinutes).toBe(300); // Saturday 5h
    expect(analyzeDay(d.timetable, 5, d.categories).productiveMinutes).toBe(420); // + 2h YouTube
  });

  it('does not double count overlapping activities', () => {
    const t = empty();
    t[0] = [act('a', '10:00', '12:00', 'dsa'), act('b', '11:00', '13:00', 'development')];
    const day = analyzeDay(t, 0, defaults().categories);
    expect(day.scheduledMinutes).toBe(3 * 60); // 10:00-13:00 once
    expect(day.byCategory.dsa).toBe(120); // earlier start keeps the shared hour
    expect(day.byCategory.development).toBe(60);
  });

  it('does not double count an overnight activity overlapping the next morning', () => {
    const t = empty();
    t[0] = [act('sleep', '23:00', '07:00', 'sleep')];
    t[1] = [act('early', '06:00', '08:00', 'dsa')];
    const week = analyzeWeek(t, defaults().categories);
    expect(week.scheduledMinutes).toBe(8 * 60 + 2 * 60 - 60); // 1h overlap counted once
  });

  it('ignores invalid activities', () => {
    const t = empty();
    t[0] = [act('bad', '10:00', '10:00', 'dsa')];
    expect(analyzeWeek(t, defaults().categories).scheduledMinutes).toBe(0);
  });
});

describe('conflicts and validation', () => {
  it('reports no conflicts in the default timetable', () => {
    expect(findConflicts(defaults().timetable).size).toBe(0);
  });

  it('detects overlaps including across midnight', () => {
    const d = defaults();
    const hits = conflictsForCandidate(d.timetable, 0, act('n', '23:00', '07:00'));
    expect(hits.map((h) => h.name)).toEqual(expect.arrayContaining(['Wind down', 'Sleep', 'DSA / Placement preparation']));
    expect(conflictsForCandidate(d.timetable, 0, act('free', '09:15', '09:30'))).toHaveLength(0);
  });

  it('validates drafts', () => {
    const cats = defaults().categories;
    expect(validateActivity({ name: 'Study', categoryId: 'dsa', start: '09:00', end: '10:00' }, cats)).toEqual([]);
    expect(validateActivity({ name: ' ', categoryId: 'dsa', start: '09:00', end: '10:00' }, cats)).toHaveLength(1);
    expect(validateActivity({ name: 'x', categoryId: 'nope', start: '09:00', end: '10:00' }, cats)).toHaveLength(1);
    expect(validateActivity({ name: 'x', categoryId: 'dsa', start: '09:00', end: '09:00' }, cats)).toHaveLength(1);
    expect(validateActivity({ name: 'x', categoryId: 'dsa', start: '', end: '09:00' }, cats)).toHaveLength(1);
  });
});
