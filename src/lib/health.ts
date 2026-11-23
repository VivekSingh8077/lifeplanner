import type {
  ActivityLevel,
  DietPreference,
  FoodItem,
  HealthProfile,
  LossPace,
  MealType,
  PortionSize,
  Sex,
} from '../types';
import { isValidDateKey } from './dates';

/* ------------------------------------------------------------------ */
/* Labels and constants                                                */
/* ------------------------------------------------------------------ */

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string; factor: number }[] = [
  { value: 'sedentary', label: 'Sedentary', description: 'Mostly sitting.', factor: 1.2 },
  { value: 'light', label: 'Lightly active', description: 'Walking and some activity.', factor: 1.375 },
  { value: 'moderate', label: 'Moderately active', description: 'Regular exercise.', factor: 1.55 },
  { value: 'very', label: 'Very active', description: 'Intense exercise or physically demanding routine.', factor: 1.725 },
];

export const PACES: { value: LossPace; label: string; kgPerWeek: number; description: string }[] = [
  { value: 'gentle', label: 'Gentle', kgPerWeek: 0.25, description: 'About 0.25 kg per week. Easiest to sustain.' },
  { value: 'steady', label: 'Steady', kgPerWeek: 0.5, description: 'About 0.5 kg per week. A common, sensible pace.' },
  { value: 'brisk', label: 'Brisk (upper limit)', kgPerWeek: 0.75, description: 'About 0.75 kg per week. Harder to sustain.' },
];

export const DIETS: { value: DietPreference; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'eggetarian', label: 'Eggetarian' },
  { value: 'non-vegetarian', label: 'Non-vegetarian' },
  { value: 'other', label: 'Other' },
];

export const SEXES: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unspecified', label: 'Prefer not to say' },
];

export const MEAL_TYPES: { value: MealType; label: string; short: string }[] = [
  { value: 'breakfast', label: 'Breakfast', short: 'Breakfast' },
  { value: 'lunch', label: 'Lunch', short: 'Lunch' },
  { value: 'evening', label: 'Evening Snacks', short: 'Evening' },
  { value: 'dinner', label: 'Dinner', short: 'Dinner' },
  { value: 'other', label: 'Other Snacks', short: 'Other' },
];

export const MEAL_LABEL: Record<MealType, string> = Object.fromEntries(
  MEAL_TYPES.map((m) => [m.value, m.label]),
) as Record<MealType, string>;

export const PORTION_FACTORS: Record<Exclude<PortionSize, 'custom'>, number> = {
  small: 0.75,
  medium: 1,
  large: 1.5,
};

/** Approximate energy in 1 kg of body weight change. A rule of thumb, not a precise value. */
export const KCAL_PER_KG = 7700;
/** Fraction of logged exercise calories added to the budget when that setting is on. */
export const EXERCISE_BUDGET_SHARE = 0.5;

export const EXERCISE_TYPES: { value: string; label: string; met: number }[] = [
  { value: 'Walking', label: 'Walking', met: 3.5 },
  { value: 'Running', label: 'Running / jogging', met: 8 },
  { value: 'Cycling', label: 'Cycling', met: 6.8 },
  { value: 'Strength training', label: 'Gym / strength training', met: 5 },
  { value: 'Yoga', label: 'Yoga / stretching', met: 2.5 },
  { value: 'Sports', label: 'Sports (badminton, football, ...)', met: 6 },
  { value: 'Swimming', label: 'Swimming', met: 6 },
  { value: 'Other', label: 'Other', met: 4 },
];

/* ------------------------------------------------------------------ */
/* Units                                                               */
/* ------------------------------------------------------------------ */

const LB_PER_KG = 2.20462262185;
export const round1 = (n: number) => Math.round(n * 10) / 10;
export const round2 = (n: number) => Math.round(n * 100) / 100;

export const kgToLb = (kg: number) => kg * LB_PER_KG;
export const lbToKg = (lb: number) => lb / LB_PER_KG;

export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalInches = Math.round(cm / 2.54);
  return { ft: Math.floor(totalInches / 12), inch: totalInches % 12 };
}

export const ftInToCm = (ft: number, inch: number) => (ft * 12 + inch) * 2.54;

/** Display weight in the user's unit, e.g. "72.4 kg" / "159.6 lb". */
export function formatWeight(kg: number, unit: 'kg' | 'lb', withUnit = true): string {
  const value = unit === 'kg' ? kg : kgToLb(kg);
  return `${round1(value)}${withUnit ? ` ${unit}` : ''}`;
}

export function formatHeight(cm: number, unit: 'cm' | 'ft'): string {
  if (unit === 'cm') return `${Math.round(cm)} cm`;
  const { ft, inch } = cmToFtIn(cm);
  return `${ft}′ ${inch}″`;
}

export const weightToDisplay = (kg: number, unit: 'kg' | 'lb') => round1(unit === 'kg' ? kg : kgToLb(kg));
export const weightFromDisplay = (value: number, unit: 'kg' | 'lb') => (unit === 'kg' ? value : lbToKg(value));

/* ------------------------------------------------------------------ */
/* Body metrics (ESTIMATES)                                            */
/* ------------------------------------------------------------------ */

export interface MetricsInput {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: 'lose' | 'maintain';
  pace: LossPace;
}

export interface BmiInfo {
  value: number;
  label: string;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** WHO adult BMI categories. */
export function bmiCategory(value: number): string {
  if (value < 18.5) return 'Underweight range';
  if (value < 25) return 'Healthy range';
  if (value < 30) return 'Overweight range';
  return 'Obese range';
}

/** Mifflin-St Jeor equation. For "unspecified" the sex constant is the midpoint of the two. */
export function estimateBmr(age: number, sex: Sex, heightCm: number, weightKg: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const constant = sex === 'male' ? 5 : sex === 'female' ? -161 : -78;
  return base + constant;
}

export function activityFactor(level: ActivityLevel): number {
  return ACTIVITY_LEVELS.find((l) => l.value === level)?.factor ?? 1.2;
}

/** Lowest daily calorie suggestion we will ever make. */
export function calorieFloor(sex: Sex): number {
  if (sex === 'male') return 1500;
  if (sex === 'female') return 1200;
  return 1350;
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export interface Metrics {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  /** Estimated maintenance calories (BMR x activity factor). */
  tdee: number;
  /** Daily deficit used for the selected pace, after safety limits. */
  deficit: number;
  /** Suggested daily calories for the selected pace. */
  suggestedCalories: number;
  /** Suggested range for gradual loss (steady pace to gentle pace), or maintenance +/- 100. */
  calorieRange: { low: number; high: number };
  suggestedProtein: number;
  proteinRange: { low: number; high: number };
  /** True when a safety limit (calorie floor, 25% cap, age cap) reduced the deficit. */
  limited: boolean;
}

export function suggestedDeficit(tdee: number, pace: LossPace, age: number): { deficit: number; limited: boolean } {
  const paceKg = PACES.find((p) => p.value === pace)?.kgPerWeek ?? 0.5;
  let deficit = (paceKg * KCAL_PER_KG) / 7;
  let limited = false;
  const cap = tdee * 0.25; // never suggest more than a 25% cut
  if (deficit > cap) {
    deficit = cap;
    limited = true;
  }
  // Under 18: keep it to the gentle pace.
  if (age < 18 && deficit > 275) {
    deficit = 275;
    limited = true;
  }
  return { deficit, limited };
}

function calorieTargetFor(tdee: number, pace: LossPace, age: number, sex: Sex): { value: number; deficit: number; limited: boolean } {
  const { deficit, limited } = suggestedDeficit(tdee, pace, age);
  const raw = tdee - deficit;
  const floor = calorieFloor(sex);
  const value = roundTo(Math.max(raw, floor), 10);
  return { value, deficit: tdee - value, limited: limited || raw < floor };
}

export function computeMetrics(input: MetricsInput): Metrics {
  const bmiValue = bmi(input.weightKg, input.heightCm);
  const bmr = estimateBmr(input.age, input.sex, input.heightCm, input.weightKg);
  const tdee = bmr * activityFactor(input.activityLevel);

  let suggested: { value: number; deficit: number; limited: boolean };
  let range: { low: number; high: number };
  if (input.goal === 'maintain') {
    suggested = { value: roundTo(tdee, 10), deficit: 0, limited: false };
    range = { low: roundTo(tdee - 100, 10), high: roundTo(tdee + 100, 10) };
  } else {
    suggested = calorieTargetFor(tdee, input.pace, input.age, input.sex);
    const steady = calorieTargetFor(tdee, 'steady', input.age, input.sex).value;
    const gentle = calorieTargetFor(tdee, 'gentle', input.age, input.sex).value;
    range = { low: Math.min(steady, gentle), high: Math.max(steady, gentle) };
  }

  return {
    bmi: bmiValue,
    bmiCategory: bmiCategory(bmiValue),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    deficit: Math.round(suggested.deficit),
    suggestedCalories: suggested.value,
    calorieRange: range,
    // 1.2 g per kg of body weight is a common recommendation while losing weight (range 1.0-1.6).
    suggestedProtein: roundTo(1.2 * input.weightKg, 5),
    proteinRange: { low: roundTo(1.0 * input.weightKg, 5), high: roundTo(1.6 * input.weightKg, 5) },
    limited: suggested.limited,
  };
}

export function metricsForProfile(profile: HealthProfile, weightKg: number = profile.currentWeightKg): Metrics {
  return computeMetrics({
    age: profile.age,
    sex: profile.sex,
    heightCm: profile.heightCm,
    weightKg,
    activityLevel: profile.activityLevel,
    goal: profile.goal,
    pace: profile.pace,
  });
}

export interface Targets {
  calories: number;
  protein: number;
  waterMl: number;
  customCalories: boolean;
  customProtein: boolean;
}

/** Targets actually used in the app: the user's override if set, otherwise the estimate. */
export function effectiveTargets(profile: HealthProfile, weightKg: number = profile.currentWeightKg): Targets {
  const m = metricsForProfile(profile, weightKg);
  return {
    calories: profile.calorieTarget ?? m.suggestedCalories,
    protein: profile.proteinTarget ?? m.suggestedProtein,
    waterMl: profile.waterTargetMl,
    customCalories: profile.calorieTarget !== null,
    customProtein: profile.proteinTarget !== null,
  };
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export interface ProfileValidation {
  errors: Partial<Record<keyof HealthProfile, string>>;
  warnings: string[];
}

export function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / 86_400_000);
}

export function validateProfile(p: HealthProfile, todayKey: string): ProfileValidation {
  const errors: ProfileValidation['errors'] = {};
  const warnings: string[] = [];

  if (!Number.isFinite(p.age) || p.age < 16 || p.age > 100) errors.age = 'Enter an age between 16 and 100.';
  else if (p.age < 18) warnings.push('Calorie estimates are designed for adults. If you are under 18, please talk to a doctor before dieting.');

  if (!Number.isFinite(p.heightCm) || p.heightCm < 120 || p.heightCm > 230) errors.heightCm = 'Enter a height between 120 and 230 cm (about 3′11″ to 7′7″).';
  if (!Number.isFinite(p.currentWeightKg) || p.currentWeightKg < 30 || p.currentWeightKg > 300) errors.currentWeightKg = 'Enter a weight between 30 and 300 kg.';

  if (!Number.isFinite(p.targetWeightKg) || p.targetWeightKg < 30 || p.targetWeightKg > 300) {
    errors.targetWeightKg = 'Enter a target between 30 and 300 kg.';
  } else if (!errors.heightCm && !errors.currentWeightKg) {
    if (p.goal === 'lose') {
      if (p.targetWeightKg >= p.currentWeightKg) errors.targetWeightKg = 'For a weight-loss goal the target must be below your current weight.';
      else if (bmi(p.targetWeightKg, p.heightCm) < 18.5) {
        const min = Math.ceil(18.5 * (p.heightCm / 100) ** 2);
        errors.targetWeightKg = `That target is below the healthy BMI range. Choose ${min} kg or more for your height.`;
      }
    }
  }

  if (p.targetDate && !isValidDateKey(p.targetDate)) errors.targetDate = 'Enter a valid calendar date.';

  if (p.goal === 'lose' && p.targetDate && isValidDateKey(p.targetDate) && !errors.targetWeightKg && !errors.currentWeightKg) {
    const days = daysBetween(todayKey, p.targetDate);
    if (days < 1) errors.targetDate = 'Pick a date in the future, or clear it.';
    else {
      const perWeek = ((p.currentWeightKg - p.targetWeightKg) / days) * 7;
      if (perWeek > 1) errors.targetDate = `That date needs about ${round1(perWeek)} kg per week, which is too fast. Choose a later date.`;
      else if (perWeek > 0.75) warnings.push(`Your target date needs about ${round1(perWeek)} kg per week. That is at the upper end of what is sensible; a later date would be easier.`);
    }
  }

  if (p.calorieTarget !== null) {
    if (!Number.isFinite(p.calorieTarget) || p.calorieTarget < 1000 || p.calorieTarget > 6000) errors.calorieTarget = 'Enter a daily calorie target between 1000 and 6000.';
    else if (p.calorieTarget < calorieFloor(p.sex)) warnings.push(`A target below ${calorieFloor(p.sex)} kcal a day is very low and not recommended without medical supervision.`);
  }
  if (p.proteinTarget !== null && (!Number.isFinite(p.proteinTarget) || p.proteinTarget < 20 || p.proteinTarget > 400)) {
    errors.proteinTarget = 'Enter a protein target between 20 and 400 g.';
  }
  if (!Number.isFinite(p.waterTargetMl) || p.waterTargetMl < 500 || p.waterTargetMl > 8000) errors.waterTargetMl = 'Enter a water target between 500 and 8000 ml.';

  return { errors, warnings };
}

/** Weeks to reach the target at the chosen pace, and the estimated date. */
export function estimateGoalDate(profile: HealthProfile, fromWeightKg: number, todayKey: string): { weeks: number; dateKey: string } | null {
  if (profile.goal !== 'lose' || fromWeightKg <= profile.targetWeightKg) return null;
  const pace = PACES.find((p) => p.value === profile.pace)?.kgPerWeek ?? 0.5;
  const weeks = (fromWeightKg - profile.targetWeightKg) / pace;
  const [y, m, d] = todayKey.split('-').map(Number);
  const date = new Date(y, m - 1, d + Math.ceil(weeks * 7));
  const pad = (n: number) => n.toString().padStart(2, '0');
  return { weeks, dateKey: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` };
}

/* ------------------------------------------------------------------ */
/* Nutrition scaling                                                   */
/* ------------------------------------------------------------------ */

export function portionFactor(food: Pick<FoodItem, 'servingGrams'>, portion: PortionSize, customGrams: number | null): number {
  if (portion === 'custom') {
    if (customGrams && customGrams > 0 && food.servingGrams && food.servingGrams > 0) return customGrams / food.servingGrams;
    return 1;
  }
  return PORTION_FACTORS[portion];
}

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Totals for an entry: per-serving values x portion factor x number of servings. */
export function scaleNutrition(
  food: Pick<FoodItem, 'calories' | 'protein' | 'carbs' | 'fat' | 'servingGrams'>,
  portion: PortionSize,
  customGrams: number | null,
  servings: number,
): Nutrition {
  const f = portionFactor(food, portion, customGrams) * servings;
  return {
    calories: Math.round(food.calories * f),
    protein: round1(food.protein * f),
    carbs: round1(food.carbs * f),
    fat: round1(food.fat * f),
  };
}

/** Rough calories burned: MET x body weight (kg) x hours. */
export function estimateExerciseCalories(type: string, minutes: number, weightKg: number): number {
  const met = EXERCISE_TYPES.find((t) => t.value === type)?.met ?? 4;
  return Math.round(met * weightKg * (minutes / 60));
}

/* ------------------------------------------------------------------ */
/* Daily calorie budget                                                */
/* ------------------------------------------------------------------ */

export interface CalorieBudget {
  /** Daily target plus any exercise allowance. */
  budget: number;
  /** Calories added from exercise (0 unless the user turned that setting on). */
  exerciseBonus: number;
  remaining: number;
}

/**
 * Exercise calories are NEVER subtracted from food intake automatically. Only when the user
 * switches on "add exercise to my budget" is half of the logged (estimated) burn added to the
 * allowance, because fitness estimates tend to run high.
 */
export function calorieBudget(target: number, addExercise: boolean, burned: number, consumed: number): CalorieBudget {
  const exerciseBonus = addExercise ? Math.round(burned * EXERCISE_BUDGET_SHARE) : 0;
  const budget = target + exerciseBonus;
  return { budget, exerciseBonus, remaining: budget - consumed };
}
