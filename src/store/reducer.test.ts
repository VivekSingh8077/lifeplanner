import { describe, expect, it } from 'vitest';
import { createDefaultData, uid } from '../data/defaults';
import type { AppData, HealthProfile } from '../types';
import { reducer } from './reducer';

const fresh = (): AppData => createDefaultData();

const profile = (over: Partial<HealthProfile> = {}): HealthProfile => ({
  age: 20,
  sex: 'male',
  heightCm: 175,
  currentWeightKg: 80,
  targetWeightKg: 72,
  activityLevel: 'light',
  goal: 'lose',
  pace: 'steady',
  targetDate: null,
  diet: 'vegetarian',
  calorieTarget: null,
  proteinTarget: null,
  waterTargetMl: 2500,
  weightUnit: 'kg',
  heightUnit: 'cm',
  addExerciseToBudget: false,
  ...over,
});

describe('revision counter (multi-tab safety)', () => {
  it('bumps rev on every change but not on sync', () => {
    let s = fresh();
    s = reducer(s, { type: 'setUse24h', value: true });
    expect(s.rev).toBe(1);
    s = reducer(s, { type: 'setTheme', theme: 'dark' });
    expect(s.rev).toBe(2);
    const other = { ...fresh(), rev: 10 };
    expect(reducer(s, { type: 'sync', data: other }).rev).toBe(10);
  });

  it('replace (import / reset) always moves the revision forward', () => {
    const s = { ...fresh(), rev: 7 };
    const next = reducer(s, { type: 'replace', data: { ...fresh(), rev: 0 } });
    expect(next.rev).toBe(8);
  });

  it('merges edits made concurrently in two tabs when the stale tab syncs first', () => {
    const base = fresh();
    // Tab B changes the theme and saves (rev 1).
    const tabB = reducer(base, { type: 'setTheme', theme: 'dark' });
    // Tab A, still on rev 0, first adopts what is stored, then applies its own edit on top.
    let tabA = reducer(base, { type: 'sync', data: tabB });
    tabA = reducer(tabA, { type: 'setUse24h', value: true });
    expect(tabA.theme).toBe('dark'); // B's change survived
    expect(tabA.use24h).toBe(true); // A's change applied
    expect(tabA.rev).toBe(2);
  });
});

describe('deleting categories', () => {
  const withCustom = () => {
    let s = fresh();
    s = reducer(s, { type: 'addCategory', category: { name: 'Gym', color: '#ec4899', kind: 'other' } });
    const gym = s.categories.find((c) => c.name === 'Gym')!;
    s = reducer(s, { type: 'addActivity', days: [0, 2], activity: { name: 'Workout', categoryId: gym.id, start: '17:00', end: '18:00' } });
    s = reducer(s, { type: 'addGoal', goal: { title: 'Lift', target: 3, unit: 'sessions', categoryId: gym.id } });
    return { s, gym };
  };

  it('moves activities to the chosen category instead of leaving dangling references', () => {
    const { s, gym } = withCustom();
    const next = reducer(s, { type: 'deleteCategory', id: gym.id, moveTo: 'dsa' });
    expect(next.categories.some((c) => c.id === gym.id)).toBe(false);
    const workouts = Object.values(next.timetable).flat().filter((a) => a.name === 'Workout');
    expect(workouts).toHaveLength(2);
    expect(workouts.every((a) => a.categoryId === 'dsa')).toBe(true);
    expect(next.goals.find((g) => g.title === 'Lift')?.categoryId).toBeUndefined();
  });

  it('falls back to a valid category when none (or an invalid one) is given', () => {
    const { s, gym } = withCustom();
    for (const moveTo of [undefined, 'does-not-exist', gym.id]) {
      const next = reducer(s, { type: 'deleteCategory', id: gym.id, moveTo });
      const ids = new Set(next.categories.map((c) => c.id));
      for (const a of Object.values(next.timetable).flat()) expect(ids.has(a.categoryId)).toBe(true);
    }
  });

  it('never deletes a built-in category', () => {
    const s = fresh();
    const next = reducer(s, { type: 'deleteCategory', id: 'dsa' });
    expect(next.categories.some((c) => c.id === 'dsa')).toBe(true);
  });
});

describe('health: profile and weight history', () => {
  it('saving a profile records the current weight as a measurement', () => {
    const s = reducer(fresh(), { type: 'saveProfile', profile: profile(), weightKg: 80, date: '2026-11-01' });
    expect(s.health.profile?.currentWeightKg).toBe(80);
    expect(s.health.weightEntries).toHaveLength(1);
    expect(s.health.weightEntries[0]).toMatchObject({ date: '2026-11-01', kg: 80 });
  });

  it('changing profile weight/target never deletes historical weight entries', () => {
    let s = fresh();
    s = reducer(s, { type: 'saveProfile', profile: profile(), weightKg: 80, date: '2026-11-01' });
    s = reducer(s, { type: 'saveWeight', date: '2026-11-08', kg: 79.2 });
    s = reducer(s, { type: 'saveProfile', profile: profile({ targetWeightKg: 70 }), weightKg: 78.5, date: '2026-11-15' });
    expect(s.health.weightEntries.map((w) => w.kg).sort()).toEqual([78.5, 79.2, 80]);
    expect(s.health.profile?.targetWeightKg).toBe(70);
  });

  it('editing the profile without changing weight adds no entry', () => {
    let s = reducer(fresh(), { type: 'saveProfile', profile: profile(), weightKg: 80, date: '2026-11-01' });
    s = reducer(s, { type: 'saveProfile', profile: profile({ age: 21 }), weightKg: 80, date: '2026-11-02' });
    expect(s.health.weightEntries).toHaveLength(1);
  });

  it('keeps one entry per date and keeps the profile weight in step with the latest entry', () => {
    let s = reducer(fresh(), { type: 'saveProfile', profile: profile(), weightKg: 80, date: '2026-11-01' });
    s = reducer(s, { type: 'saveWeight', date: '2026-11-10', kg: 79 });
    s = reducer(s, { type: 'saveWeight', date: '2026-11-10', kg: 78.8 });
    expect(s.health.weightEntries.filter((w) => w.date === '2026-11-10')).toHaveLength(1);
    expect(s.health.profile?.currentWeightKg).toBe(78.8);
    const latest = s.health.weightEntries.find((w) => w.date === '2026-11-10')!;
    s = reducer(s, { type: 'deleteWeight', id: latest.id });
    expect(s.health.profile?.currentWeightKg).toBe(80);
  });

  it('editing an entry to another date replaces any entry already on that date', () => {
    let s = fresh();
    s = reducer(s, { type: 'saveWeight', date: '2026-11-01', kg: 80 });
    s = reducer(s, { type: 'saveWeight', date: '2026-11-02', kg: 79 });
    const first = s.health.weightEntries.find((w) => w.date === '2026-11-01')!;
    s = reducer(s, { type: 'saveWeight', id: first.id, date: '2026-11-02', kg: 79.5 });
    expect(s.health.weightEntries).toHaveLength(1);
    expect(s.health.weightEntries[0].kg).toBe(79.5);
  });
});

describe('health: food database and logs', () => {
  it('custom foods can be added, edited and deleted; starter foods cannot be deleted', () => {
    let s = reducer(fresh(), { type: 'addFood', food: { name: 'My Smoothie', servingLabel: '1 glass', servingGrams: 300, calories: 200, protein: 10, carbs: 30, fat: 4, approximate: false, favorite: false, meals: ['breakfast'] } });
    const custom = s.health.foods.find((f) => f.name === 'My Smoothie')!;
    expect(custom.source).toBe('custom');
    s = reducer(s, { type: 'updateFood', id: custom.id, patch: { calories: 220 } });
    expect(s.health.foods.find((f) => f.id === custom.id)?.calories).toBe(220);
    s = reducer(s, { type: 'deleteFood', id: custom.id });
    expect(s.health.foods.some((f) => f.id === custom.id)).toBe(false);

    const starter = s.health.foods.find((f) => f.source === 'starter')!;
    const before = s.health.foods.length;
    s = reducer(s, { type: 'deleteFood', id: starter.id });
    expect(s.health.foods).toHaveLength(before);
  });

  it('starter foods can be edited and restored, keeping the favourite flag', () => {
    let s = fresh();
    const starter = s.health.foods.find((f) => f.id === 'starter-samosa')!;
    s = reducer(s, { type: 'updateFood', id: starter.id, patch: { calories: 999, favorite: true } });
    expect(s.health.foods.find((f) => f.id === starter.id)?.calories).toBe(999);
    s = reducer(s, { type: 'restoreStarterFood', id: starter.id });
    const restored = s.health.foods.find((f) => f.id === starter.id)!;
    expect(restored.calories).toBe(starter.calories);
    expect(restored.favorite).toBe(true);
  });

  it('logged meals keep their own nutrition when the food is later edited', () => {
    let s = fresh();
    s = reducer(s, { type: 'addMeal', entry: { date: '2026-11-01', time: '08:00', meal: 'breakfast', foodId: 'starter-poha-indori-poha', name: 'Poha', servingLabel: '1 plate', servings: 1, portion: 'medium', customGrams: null, calories: 250, protein: 5, carbs: 42, fat: 7 } });
    s = reducer(s, { type: 'updateFood', id: 'starter-poha-indori-poha', patch: { calories: 400 } });
    expect(s.health.mealEntries[0].calories).toBe(250);
  });

  it('resetHealth clears health data only', () => {
    let s = reducer(fresh(), { type: 'saveProfile', profile: profile(), weightKg: 80, date: '2026-11-01' });
    s = reducer(s, { type: 'resetHealth' });
    expect(s.health.profile).toBeNull();
    expect(s.health.weightEntries).toHaveLength(0);
    expect(Object.values(s.timetable).flat().length).toBeGreaterThan(0);
  });

  it('water and exercise entries can be added and removed', () => {
    let s = reducer(fresh(), { type: 'addWater', entry: { date: '2026-11-01', time: '09:00', ml: 250 } });
    s = reducer(s, { type: 'addExercise', entry: { date: '2026-11-01', type: 'Walking', minutes: 30, caloriesBurned: null } });
    expect(s.health.waterEntries).toHaveLength(1);
    expect(s.health.exerciseEntries).toHaveLength(1);
    s = reducer(s, { type: 'deleteWater', id: s.health.waterEntries[0].id });
    s = reducer(s, { type: 'deleteExercise', id: s.health.exerciseEntries[0].id });
    expect(s.health.waterEntries).toHaveLength(0);
    expect(s.health.exerciseEntries).toHaveLength(0);
  });

  it('uid never repeats', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => uid('x')));
    expect(ids.size).toBe(2000);
  });
});
