import { defaultHealth } from '../data/defaults';
import { STARTER_FOODS } from '../data/starterFoods';
import type {
  ActivityLevel,
  DietPreference,
  ExerciseEntry,
  FoodItem,
  HealthData,
  HealthProfile,
  LossPace,
  MealEntry,
  MealType,
  PortionSize,
  Sex,
  WaterEntry,
  WeightEntry,
} from '../types';
import { parseTime } from './time';
import { isValidDateKey } from './dates';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const validDate = (value: unknown): value is string => isString(value) && isValidDateKey(value);

function num(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
}
function oneOf<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  return isString(v) && (options as readonly string[]).includes(v) ? (v as T) : fallback;
}
function time(v: unknown): string {
  return isString(v) && parseTime(v) !== null ? v.padStart(5, '0') : '12:00';
}
function ensureId(v: unknown, used: Set<string>, prefix: string): string {
  let id = isString(v) && v ? v : `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  while (used.has(id)) id = `${id}-${Math.random().toString(36).slice(2, 5)}`;
  used.add(id);
  return id;
}

const SEXES: Sex[] = ['male', 'female', 'unspecified'];
const LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'very'];
const PACES: LossPace[] = ['gentle', 'steady', 'brisk'];
const DIETS: DietPreference[] = ['vegetarian', 'vegan', 'eggetarian', 'non-vegetarian', 'other'];
const MEALS: MealType[] = ['breakfast', 'lunch', 'evening', 'dinner', 'other'];
const PORTIONS: PortionSize[] = ['small', 'medium', 'large', 'custom'];

export function sanitizeProfile(raw: unknown): HealthProfile | null {
  if (!isRecord(raw)) return null;
  const age = num(raw.age, 1, 120);
  const heightCm = num(raw.heightCm, 50, 260);
  const currentWeightKg = num(raw.currentWeightKg, 20, 400);
  const targetWeightKg = num(raw.targetWeightKg, 20, 400);
  if (age === null || heightCm === null || currentWeightKg === null || targetWeightKg === null) return null;
  return {
    age,
    sex: oneOf(raw.sex, SEXES, 'unspecified'),
    heightCm,
    currentWeightKg,
    targetWeightKg,
    activityLevel: oneOf(raw.activityLevel, LEVELS, 'light'),
    goal: raw.goal === 'maintain' ? 'maintain' : 'lose',
    pace: oneOf(raw.pace, PACES, 'steady'),
    targetDate: validDate(raw.targetDate) ? raw.targetDate : null,
    diet: oneOf(raw.diet, DIETS, 'vegetarian'),
    calorieTarget: num(raw.calorieTarget, 500, 10000),
    proteinTarget: num(raw.proteinTarget, 10, 500),
    waterTargetMl: num(raw.waterTargetMl, 250, 10000) ?? 2500,
    weightUnit: raw.weightUnit === 'lb' ? 'lb' : 'kg',
    heightUnit: raw.heightUnit === 'ft' ? 'ft' : 'cm',
    addExerciseToBudget: raw.addExerciseToBudget === true,
  };
}

function sanitizeWeights(raw: unknown): WeightEntry[] {
  if (!Array.isArray(raw)) return [];
  const used = new Set<string>();
  const out: WeightEntry[] = [];
  for (const r of raw) {
    if (!isRecord(r) || !validDate(r.date)) continue;
    const kg = num(r.kg, 20, 400);
    if (kg === null) continue;
    out.push({ id: ensureId(r.id, used, 'wt'), date: r.date, kg, note: isString(r.note) && r.note ? r.note : undefined });
  }
  return out;
}

function sanitizeFood(r: unknown, used: Set<string>): FoodItem | null {
  if (!isRecord(r) || !isString(r.name) || !r.name.trim()) return null;
  const calories = num(r.calories, 0, 5000);
  const protein = num(r.protein, 0, 500);
  const carbs = num(r.carbs, 0, 1000);
  const fat = num(r.fat, 0, 500);
  if (calories === null || protein === null || carbs === null || fat === null) return null;
  const meals = Array.isArray(r.meals) ? (r.meals.filter((m): m is MealType => (MEALS as string[]).includes(m as string))) : [];
  return {
    id: ensureId(r.id, used, 'food'),
    name: r.name.trim(),
    servingLabel: isString(r.servingLabel) && r.servingLabel ? r.servingLabel : '1 serving',
    servingGrams: num(r.servingGrams, 1, 5000),
    calories,
    protein,
    carbs,
    fat,
    source: r.source === 'starter' ? 'starter' : 'custom',
    approximate: r.approximate !== false,
    favorite: r.favorite === true,
    meals,
    note: isString(r.note) && r.note ? r.note : undefined,
  };
}

function sanitizeFoods(raw: unknown): FoodItem[] {
  const used = new Set<string>();
  const foods: FoodItem[] = [];
  if (Array.isArray(raw)) {
    for (const r of raw) {
      const f = sanitizeFood(r, used);
      if (f) foods.push(f);
    }
  }
  // Make sure every starter food exists (new starter foods appear after an update; edits are never overwritten).
  const have = new Set(foods.map((f) => f.id));
  for (const s of STARTER_FOODS) {
    if (!have.has(s.id)) foods.push({ ...s, meals: [...s.meals] });
  }
  return foods;
}

function sanitizeMeals(raw: unknown): MealEntry[] {
  if (!Array.isArray(raw)) return [];
  const used = new Set<string>();
  const out: MealEntry[] = [];
  for (const r of raw) {
    if (!isRecord(r) || !validDate(r.date) || !isString(r.name)) continue;
    const calories = num(r.calories, 0, 20000);
    const protein = num(r.protein, 0, 2000);
    const carbs = num(r.carbs, 0, 4000);
    const fat = num(r.fat, 0, 2000);
    const servings = num(r.servings, 0.01, 1000);
    if (calories === null || protein === null || carbs === null || fat === null || servings === null) continue;
    out.push({
      id: ensureId(r.id, used, 'meal'),
      date: r.date,
      time: time(r.time),
      meal: oneOf(r.meal, MEALS, 'other'),
      foodId: isString(r.foodId) ? r.foodId : null,
      name: r.name,
      servingLabel: isString(r.servingLabel) ? r.servingLabel : '1 serving',
      servings,
      portion: oneOf(r.portion, PORTIONS, 'medium'),
      customGrams: num(r.customGrams, 1, 10000),
      calories,
      protein,
      carbs,
      fat,
    });
  }
  return out;
}

function sanitizeExercise(raw: unknown): ExerciseEntry[] {
  if (!Array.isArray(raw)) return [];
  const used = new Set<string>();
  const out: ExerciseEntry[] = [];
  for (const r of raw) {
    if (!isRecord(r) || !validDate(r.date) || !isString(r.type)) continue;
    const minutes = num(r.minutes, 1, 1440);
    if (minutes === null) continue;
    out.push({
      id: ensureId(r.id, used, 'ex'),
      date: r.date,
      type: r.type,
      minutes,
      caloriesBurned: num(r.caloriesBurned, 0, 10000),
      note: isString(r.note) && r.note ? r.note : undefined,
    });
  }
  return out;
}

function sanitizeWater(raw: unknown): WaterEntry[] {
  if (!Array.isArray(raw)) return [];
  const used = new Set<string>();
  const out: WaterEntry[] = [];
  for (const r of raw) {
    if (!isRecord(r) || !validDate(r.date)) continue;
    const ml = num(r.ml, 1, 10000);
    if (ml === null) continue;
    out.push({ id: ensureId(r.id, used, 'water'), date: r.date, time: time(r.time), ml });
  }
  return out;
}

/** Build clean health data from anything. Missing / old data produces an empty module with the starter foods. */
export function sanitizeHealth(raw: unknown): HealthData {
  if (!isRecord(raw)) return defaultHealth();
  return {
    profile: sanitizeProfile(raw.profile),
    weightEntries: sanitizeWeights(raw.weightEntries),
    foods: sanitizeFoods(raw.foods),
    mealEntries: sanitizeMeals(raw.mealEntries),
    exerciseEntries: sanitizeExercise(raw.exerciseEntries),
    waterEntries: sanitizeWater(raw.waterEntries),
  };
}
