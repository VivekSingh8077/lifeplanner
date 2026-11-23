import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultData } from '../data/defaults';
import { STARTER_FOODS } from '../data/starterFoods';
import { BACKUP_KEY, RECOVERY_BACKUP_KEY, exportJson, loadData, migrateData, MAX_IMPORT_CHARS, parseImport, saveData, STORAGE_KEY } from './storage';

/** Minimal in-memory localStorage for the node test environment. */
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});
afterEach(() => {
  delete (globalThis as unknown as { localStorage?: MemoryStorage }).localStorage;
});

/** What the planner stored before the Health module existed (format version 1). */
function legacyV1() {
  const d = createDefaultData() as unknown as Record<string, unknown>;
  delete d.health;
  delete d.rev;
  d.version = 1;
  d.theme = 'dark';
  d.use24h = true;
  (d.goalProgress as Record<string, Record<string, number>>)['2026-11-16'] = { 'goal-dsa': 4 };
  (d.completions as Record<string, string[]>)['2026-11-22'] = ['abc'];
  return d;
}

describe('migration from the planner-only (v1) format', () => {
  it('keeps every existing planner field and adds an empty health module', () => {
    const legacy = legacyV1();
    const { data, includesHealth } = migrateData(legacy);
    expect(includesHealth).toBe(false);
    expect(data.version).toBe(2);
    expect(data.theme).toBe('dark');
    expect(data.use24h).toBe(true);
    expect(data.goalProgress['2026-11-16']['goal-dsa']).toBe(4);
    expect(data.completions['2026-11-22']).toEqual(['abc']);
    expect(Object.values(data.timetable).flat().length).toBe(Object.values(createDefaultData().timetable).flat().length);
    expect(data.health.profile).toBeNull();
    expect(data.health.foods.length).toBe(STARTER_FOODS.length);
  });

  it('loadData upgrades stored v1 data, keeps it intact and saves a one-time backup', () => {
    const legacy = legacyV1();
    const text = JSON.stringify(legacy);
    localStorage.setItem(STORAGE_KEY, text);
    const { data } = loadData();
    expect(data.version).toBe(2);
    expect(data.theme).toBe('dark');
    expect(localStorage.getItem(BACKUP_KEY)).toBe(text); // untouched copy of the old data
    // A second load must not overwrite the backup.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...legacy, theme: 'light' }));
    loadData();
    expect(localStorage.getItem(BACKUP_KEY)).toBe(text);
  });

  it('does not create a backup when the data is already in the new format', () => {
    saveData(createDefaultData());
    loadData();
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('preserves corrupt stored data before falling back to defaults', () => {
    const corrupt = '{not json';
    localStorage.setItem(STORAGE_KEY, corrupt);
    expect(loadData().data.health.profile).toBeNull();
    expect(localStorage.getItem(RECOVERY_BACKUP_KEY)).toBe(corrupt);
  });
});

describe('export / import', () => {
  it('round-trips planner and health data', () => {
    const d = createDefaultData();
    d.health.profile = {
      age: 20, sex: 'male', heightCm: 175, currentWeightKg: 80, targetWeightKg: 72, activityLevel: 'light', goal: 'lose', pace: 'steady',
      targetDate: '2027-03-01', diet: 'vegetarian', calorieTarget: 1900, proteinTarget: null, waterTargetMl: 3000, weightUnit: 'lb', heightUnit: 'ft', addExerciseToBudget: true,
    };
    d.health.weightEntries.push({ id: 'w1', date: '2026-11-01', kg: 80 });
    d.health.mealEntries.push({ id: 'm1', date: '2026-11-01', time: '08:30', meal: 'breakfast', foodId: null, name: 'Poha', servingLabel: '1 plate', servings: 1, portion: 'large', customGrams: null, calories: 375, protein: 7.5, carbs: 63, fat: 10.5 });
    d.health.waterEntries.push({ id: 'h1', date: '2026-11-01', time: '09:00', ml: 500 });
    d.health.exerciseEntries.push({ id: 'e1', date: '2026-11-01', type: 'Walking', minutes: 30, caloriesBurned: 100 });
    const { data, includesHealth } = parseImport(exportJson(d));
    expect(includesHealth).toBe(true);
    expect(data.health.profile).toEqual(d.health.profile);
    expect(data.health.weightEntries).toEqual(d.health.weightEntries);
    expect(data.health.mealEntries).toEqual(d.health.mealEntries);
    expect(data.health.waterEntries).toEqual(d.health.waterEntries);
    expect(data.health.exerciseEntries).toEqual(d.health.exerciseEntries);
    expect(Object.values(data.timetable).flat().length).toBe(Object.values(d.timetable).flat().length);
  });

  it('still accepts old (v1) export files', () => {
    const wrapped = JSON.stringify({ app: 'mylife-planner', version: 1, exportedAt: '2026-11-22T00:00:00Z', data: legacyV1() });
    const { data, includesHealth } = parseImport(wrapped);
    expect(includesHealth).toBe(false);
    expect(data.theme).toBe('dark');
  });

  it('rejects oversized import payloads before parsing', () => {
    expect(() => parseImport(' '.repeat(MAX_IMPORT_CHARS + 1))).toThrow(/larger than 5 MB/);
  });

    it('rejects things that are not planner data', () => {
    for (const bad of ['not json', '[]', '{"x":1}', '42', 'null']) {
      expect(() => parseImport(bad)).toThrow();
    }
  });

  it('drops invalid health records but keeps valid ones, and restores missing starter foods', () => {
    const json = JSON.stringify({
      timetable: {},
      health: {
        profile: { age: 'x' },
        weightEntries: [
          { id: 'ok', date: '2026-11-01', kg: 80 },
          { id: 'bad1', date: '01/11/2026', kg: 80 },
          { id: 'bad-date', date: '2026-02-31', kg: 80 },
          { id: 'bad2', date: '2026-11-02', kg: -5 },
          { id: 'bad3', date: '2026-11-03', kg: 'heavy' },
        ],
        foods: [{ id: 'c1', name: 'Mine', servingLabel: '1', calories: 100, protein: 1, carbs: 1, fat: 1, source: 'custom' }, { name: '', calories: 1 }],
        mealEntries: [{ id: 'm', date: '2026-11-01', name: 'X', servings: 0, calories: 1, protein: 1, carbs: 1, fat: 1 }],
        waterEntries: [{ id: 'w', date: '2026-11-01', ml: 250 }, { id: 'w2', date: 'bad', ml: 250 }],
        exerciseEntries: [{ id: 'e', date: '2026-11-01', type: 'Walking', minutes: 0 }],
      },
    });
    const { data } = parseImport(json);
    expect(data.health.profile).toBeNull();
    expect(data.health.weightEntries.map((w) => w.id)).toEqual(['ok']);
    expect(data.health.foods.filter((f) => f.source === 'custom').map((f) => f.id)).toEqual(['c1']);
    expect(data.health.foods.filter((f) => f.source === 'starter')).toHaveLength(STARTER_FOODS.length);
    expect(data.health.mealEntries).toHaveLength(0);
    expect(data.health.waterEntries).toHaveLength(1);
    expect(data.health.exerciseEntries).toHaveLength(0);
  });

  it("keeps the user's edits to starter foods when re-importing", () => {
    const d = createDefaultData();
    d.health.foods = d.health.foods.map((f) => (f.id === 'starter-samosa' ? { ...f, calories: 321 } : f));
    const { data } = parseImport(exportJson(d));
    expect(data.health.foods.find((f) => f.id === 'starter-samosa')?.calories).toBe(321);
  });

  it('sanitises a bad planner section without throwing', () => {
    const { data } = migrateData({ timetable: { 0: [{ id: 'a', name: 'Ok', categoryId: 'dsa', start: '7:00', end: '08:00' }, { name: 'bad', start: '99:00', end: '1:00' }] } });
    expect(data.timetable[0]).toHaveLength(1);
    expect(data.timetable[0][0].start).toBe('07:00');
    expect(data.timetable[1].length).toBeGreaterThan(0); // missing days fall back to defaults
  });
});
