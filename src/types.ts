/** 0 = Monday … 6 = Sunday */
export type DayId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * How a category counts in analytics:
 *  - study:      counts as study AND productive time
 *  - productive: counts as productive time only (e.g. YouTube production)
 *  - other:      neither
 */
export type CategoryKind = 'study' | 'productive' | 'other';

export interface Category {
  id: string;
  name: string;
  /** Hex colour such as #3b82f6 */
  color: string;
  kind: CategoryKind;
  /** Built-in categories drive dashboard cards and can't be deleted (but can be renamed/recoloured). */
  builtIn?: boolean;
}

export interface Activity {
  id: string;
  name: string;
  categoryId: string;
  /** 24h "HH:MM". */
  start: string;
  /** 24h "HH:MM". If end is earlier than start the activity runs past midnight (e.g. Sleep). */
  end: string;
}

export type Timetable = Record<DayId, Activity[]>;

export interface Goal {
  id: string;
  title: string;
  /** Numeric weekly target used for the progress bar. */
  target: number;
  /** Unit shown next to the numbers, e.g. "problems". */
  unit: string;
  /** Optional human-friendly target text, e.g. "10–12 problems". */
  targetText?: string;
  categoryId?: string;
}

export type ThemePref = 'light' | 'dark' | 'system';

/* ------------------------------------------------------------------ */
/* Health & Fitness                                                    */
/* ------------------------------------------------------------------ */

export type Sex = 'male' | 'female' | 'unspecified';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very';
export type WeightGoal = 'lose' | 'maintain';
/** gentle = 0.25 kg/week, steady = 0.5 kg/week, brisk = 0.75 kg/week (upper limit offered). */
export type LossPace = 'gentle' | 'steady' | 'brisk';
export type DietPreference = 'vegetarian' | 'vegan' | 'eggetarian' | 'non-vegetarian' | 'other';
export type WeightUnit = 'kg' | 'lb';
export type HeightUnit = 'cm' | 'ft';
export type MealType = 'breakfast' | 'lunch' | 'evening' | 'dinner' | 'other';
export type PortionSize = 'small' | 'medium' | 'large' | 'custom';

/** Weight and height are always stored in kg / cm; units are a display preference. */
export interface HealthProfile {
  age: number;
  sex: Sex;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  goal: WeightGoal;
  pace: LossPace;
  /** ISO date (YYYY-MM-DD) or null. */
  targetDate: string | null;
  diet: DietPreference;
  /** null = use the automatically calculated estimate. */
  calorieTarget: number | null;
  /** null = use the automatically calculated estimate. */
  proteinTarget: number | null;
  waterTargetMl: number;
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
  /** When true, half of logged exercise calories are added to the daily budget. Off by default. */
  addExerciseToBudget: boolean;
}

export interface WeightEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  kg: number;
  note?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  /** Description of one serving, e.g. "1 katori (~150 g)". */
  servingLabel: string;
  /** Approximate weight of one serving, used for custom-weight portions. */
  servingGrams: number | null;
  /** Nutrition for ONE serving. */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: 'starter' | 'custom';
  /** True for estimated values (all starter foods). */
  approximate: boolean;
  favorite: boolean;
  /** Meals this food is usually eaten at (used for filtering suggestions). */
  meals: MealType[];
  note?: string;
}

export interface MealEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  time: string;
  meal: MealType;
  /** Source food (may since have been deleted); nutrition below is a snapshot. */
  foodId: string | null;
  name: string;
  servingLabel: string;
  servings: number;
  portion: PortionSize;
  customGrams: number | null;
  /** Totals for the whole entry (per-serving values x portion x servings). */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WaterEntry {
  id: string;
  date: string;
  time: string;
  ml: number;
}

export interface ExerciseEntry {
  id: string;
  date: string;
  type: string;
  minutes: number;
  /** Optional, user supplied or estimated. */
  caloriesBurned: number | null;
  note?: string;
}

export interface HealthData {
  profile: HealthProfile | null;
  weightEntries: WeightEntry[];
  foods: FoodItem[];
  mealEntries: MealEntry[];
  exerciseEntries: ExerciseEntry[];
  waterEntries: WaterEntry[];
}

export interface AppData {
  /** Data format version. 1 = planner only, 2 = adds `health` and `rev`. */
  version: 2;
  /** Incremented on every change; used to detect edits made in another browser tab. */
  rev: number;
  theme: ThemePref;
  use24h: boolean;
  categories: Category[];
  timetable: Timetable;
  goals: Goal[];
  /** weekKey (Monday's date) -> goalId -> progress */
  goalProgress: Record<string, Record<string, number>>;
  /** dateKey (YYYY-MM-DD) -> completed activity ids */
  completions: Record<string, string[]>;
  health: HealthData;
}

export type HealthPage = 'health' | 'health-food' | 'health-weight' | 'health-reports' | 'health-profile';
export type Page = 'dashboard' | 'timetable' | 'analytics' | 'goals' | 'settings' | HealthPage;
