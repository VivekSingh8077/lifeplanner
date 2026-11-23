import { describe, expect, it } from 'vitest';
import { defaultHealth } from '../data/defaults';
import type { HealthData, MealEntry } from '../types';
import {
  addDays,
  averageWeightLast,
  buildReport,
  dateRange,
  exerciseOn,
  monthlyAverages,
  nutritionForEntries,
  waterOn,
  weekStartKey,
  weeklyAverages,
  weightSeries,
} from './healthStats';

const meal = (date: string, m: MealEntry['meal'], calories: number, protein = 0): MealEntry => ({
  id: `${date}-${m}-${calories}`, date, time: '12:00', meal: m, foodId: null, name: 'x', servingLabel: '1', servings: 1, portion: 'medium', customGrams: null, calories, protein, carbs: calories / 10, fat: calories / 30,
});

const health = (over: Partial<HealthData> = {}): HealthData => ({ ...defaultHealth(), ...over });

describe('date helpers', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('builds inclusive ranges and week starts (Monday)', () => {
    expect(dateRange('2026-11-20', '2026-11-23')).toEqual(['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23']);
    expect(weekStartKey('2026-11-22')).toBe('2026-11-16'); // Sunday -> Monday before
    expect(weekStartKey('2026-11-16')).toBe('2026-11-16');
  });
});

describe('daily totals', () => {
  it('sums calories and macros and splits calories by meal', () => {
    const n = nutritionForEntries([meal('2026-11-22', 'breakfast', 300, 10), meal('2026-11-22', 'lunch', 600, 25), meal('2026-11-22', 'breakfast', 100, 5)]);
    expect(n.calories).toBe(1000);
    expect(n.protein).toBe(40);
    expect(n.byMeal).toEqual({ breakfast: 400, lunch: 600, evening: 0, dinner: 0, other: 0 });
  });
  it('totals water and exercise for a date only', () => {
    const w = [
      { id: '1', date: '2026-11-22', time: '08:00', ml: 250 },
      { id: '2', date: '2026-11-22', time: '10:00', ml: 500 },
      { id: '3', date: '2026-11-21', time: '10:00', ml: 900 },
    ];
    expect(waterOn(w, '2026-11-22')).toBe(750);
    const ex = [
      { id: 'a', date: '2026-11-22', type: 'Walking', minutes: 30, caloriesBurned: 100 },
      { id: 'b', date: '2026-11-22', type: 'Yoga', minutes: 20, caloriesBurned: null },
    ];
    expect(exerciseOn(ex, '2026-11-22')).toEqual({ sessions: 2, minutes: 50, calories: 100 });
  });
});

describe('weight series and averages', () => {
  const entries = [
    { id: '1', date: '2026-11-01', kg: 80 },
    { id: '2', date: '2026-11-02', kg: 81 },
    { id: '3', date: '2026-11-03', kg: 79 },
    { id: '4', date: '2026-11-10', kg: 78 },
  ];
  it('computes a trailing 7-day average', () => {
    const s = weightSeries(entries);
    expect(s[0].avg7).toBe(80);
    expect(s[1].avg7).toBe(80.5);
    expect(s[2].avg7).toBe(80);
    expect(s[3].avg7).toBe(78); // earlier entries are > 6 days away
  });
  it('sorts unsorted input', () => {
    expect(weightSeries([...entries].reverse()).map((p) => p.date)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-10']);
  });
  it('groups into weekly and monthly averages', () => {
    const weeks = weeklyAverages(entries);
    // Nov 1 2026 is a Sunday, so it belongs to the week starting Mon Oct 26.
    expect(weeks.map((w) => [w.key, w.avg, w.count])).toEqual([
      ['2026-10-26', 80, 1],
      ['2026-11-02', 80, 2],
      ['2026-11-09', 78, 1],
    ]);
    const months = monthlyAverages(entries);
    expect(months).toHaveLength(1);
    expect(months[0].avg).toBe(79.5);
  });
  it('averages the last N days', () => {
    expect(averageWeightLast(entries, '2026-11-10', 7)).toBe(78);
    expect(averageWeightLast(entries, '2026-11-10', 14)).toBe(79.5);
    expect(averageWeightLast([], '2026-11-10', 7)).toBeNull();
  });
});

describe('period report', () => {
  it('averages calories and protein only over days that were logged', () => {
    const h = health({ mealEntries: [meal('2026-11-16', 'breakfast', 400, 20), meal('2026-11-16', 'dinner', 800, 30), meal('2026-11-18', 'lunch', 1000, 40)] });
    const r = buildReport(h, '2026-11-16', '2026-11-22');
    expect(r.days).toBe(7);
    expect(r.loggedDays).toBe(2);
    expect(r.avgCalories).toBe(1100); // (1200 + 1000) / 2
    expect(r.avgProtein).toBe(45);
    expect(r.mealAverages).toEqual({ breakfast: 200, lunch: 500, evening: 0, dinner: 400, other: 0 });
    expect(r.daily).toHaveLength(7);
  });

  it('handles an empty period without NaN', () => {
    const r = buildReport(health(), '2026-11-16', '2026-11-22');
    expect(r.avgCalories).toBeNull();
    expect(r.avgProtein).toBeNull();
    expect(r.avgWaterMl).toBeNull();
    expect(r.weight.change).toBeNull();
    expect(r.exerciseDays).toBe(0);
  });

  it('measures water and exercise frequency', () => {
    const h = health({
      waterEntries: [{ id: '1', date: '2026-11-16', time: '08:00', ml: 2000 }, { id: '2', date: '2026-11-17', time: '08:00', ml: 3000 }],
      exerciseEntries: [
        { id: 'a', date: '2026-11-16', type: 'Walking', minutes: 30, caloriesBurned: null },
        { id: 'b', date: '2026-11-16', type: 'Yoga', minutes: 15, caloriesBurned: null },
        { id: 'c', date: '2026-11-19', type: 'Running', minutes: 25, caloriesBurned: null },
      ],
    });
    const r = buildReport(h, '2026-11-16', '2026-11-22');
    expect(r.avgWaterMl).toBe(2500);
    expect(r.waterDays).toBe(2);
    expect(r.exerciseDays).toBe(2);
    expect(r.exerciseSessions).toBe(3);
    expect(r.exerciseMinutes).toBe(70);
  });

  it('weight change compares multi-day averages, not single readings', () => {
    // A one-day spike on the last day must not look like a gain: the end average smooths it.
    const w = [
      { id: '1', date: '2026-11-01', kg: 80.4 },
      { id: '2', date: '2026-11-02', kg: 79.6 },
      { id: '3', date: '2026-11-03', kg: 80.0 },
      { id: '4', date: '2026-11-28', kg: 78.0 },
      { id: '5', date: '2026-11-29', kg: 78.2 },
      { id: '6', date: '2026-11-30', kg: 79.4 }, // water-weight spike
    ];
    const r = buildReport(health({ weightEntries: w }), '2026-11-01', '2026-11-30');
    expect(r.weight.startAvg).toBe(80);
    expect(r.weight.endAvg).toBe(78.53);
    expect(r.weight.change).toBe(-1.47);
  });

  it('reports no weight change with fewer than two measurements', () => {
    const r = buildReport(health({ weightEntries: [{ id: '1', date: '2026-11-16', kg: 80 }] }), '2026-11-16', '2026-11-22');
    expect(r.weight.change).toBeNull();
    expect(r.weight.startAvg).toBe(80);
  });
});
