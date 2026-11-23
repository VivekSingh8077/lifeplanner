import { DEFAULT_CATEGORIES, defaultDay, defaultHealth, defaultTimetable, uid } from '../data/defaults';
import { getStarterFood } from '../data/starterFoods';
import { latestWeightEntry } from '../lib/healthStats';
import type {
  Activity,
  AppData,
  Category,
  DayId,
  ExerciseEntry,
  FoodItem,
  Goal,
  HealthData,
  HealthProfile,
  MealEntry,
  ThemePref,
  WaterEntry,
  WeightEntry,
} from '../types';

export type Action =
  /** Adopt data written by another tab / the initial load, exactly as given (no revision bump). */
  | { type: 'sync'; data: AppData }
  /** Replace everything (import / reset). */
  | { type: 'replace'; data: AppData }
  | { type: 'setTheme'; theme: ThemePref }
  | { type: 'setUse24h'; value: boolean }
  | { type: 'addActivity'; days: DayId[]; activity: Omit<Activity, 'id'> }
  | { type: 'updateActivity'; day: DayId; id: string; patch: Partial<Omit<Activity, 'id'>> }
  | { type: 'deleteActivity'; day: DayId; id: string }
  | { type: 'copyDay'; from: DayId; to: DayId[] }
  | { type: 'clearDay'; day: DayId }
  | { type: 'resetDay'; day: DayId }
  | { type: 'resetTimetable' }
  | { type: 'addCategory'; category: Omit<Category, 'id'> }
  | { type: 'updateCategory'; id: string; patch: Partial<Omit<Category, 'id' | 'builtIn'>> }
  | { type: 'deleteCategory'; id: string; moveTo?: string }
  | { type: 'addGoal'; goal: Omit<Goal, 'id'> }
  | { type: 'updateGoal'; id: string; patch: Partial<Omit<Goal, 'id'>> }
  | { type: 'deleteGoal'; id: string }
  | { type: 'setProgress'; week: string; goalId: string; value: number }
  | { type: 'resetWeekProgress'; week: string }
  | { type: 'toggleCompletion'; dateKey: string; activityId: string }
  // ---- Health & Fitness ----
  | { type: 'saveProfile'; profile: HealthProfile; weightKg: number | null; date: string }
  | { type: 'saveWeight'; id?: string; date: string; kg: number; note?: string }
  | { type: 'deleteWeight'; id: string }
  | { type: 'addMeal'; entry: Omit<MealEntry, 'id'> }
  | { type: 'updateMeal'; id: string; entry: Omit<MealEntry, 'id'> }
  | { type: 'deleteMeal'; id: string }
  | { type: 'addFood'; food: Omit<FoodItem, 'id' | 'source'> }
  | { type: 'updateFood'; id: string; patch: Partial<Omit<FoodItem, 'id' | 'source'>> }
  | { type: 'deleteFood'; id: string }
  | { type: 'restoreStarterFood'; id: string }
  | { type: 'addWater'; entry: Omit<WaterEntry, 'id'> }
  | { type: 'deleteWater'; id: string }
  | { type: 'addExercise'; entry: Omit<ExerciseEntry, 'id'> }
  | { type: 'deleteExercise'; id: string }
  | { type: 'resetHealth' };

const withHealth = (state: AppData, patch: Partial<HealthData>): AppData => ({ ...state, health: { ...state.health, ...patch } });

/** Keep the profile's current weight in step with the latest weight entry (history is never touched). */
function syncProfileWeight(health: HealthData): HealthData {
  const latest = latestWeightEntry(health.weightEntries);
  if (!health.profile || !latest || health.profile.currentWeightKg === latest.kg) return health;
  return { ...health, profile: { ...health.profile, currentWeightKg: latest.kg } };
}

function apply(state: AppData, action: Exclude<Action, { type: 'sync' }>): AppData {
  switch (action.type) {
    case 'replace':
      return action.data;
    case 'setTheme':
      return { ...state, theme: action.theme };
    case 'setUse24h':
      return { ...state, use24h: action.value };

    case 'addActivity': {
      const timetable = { ...state.timetable };
      for (const day of action.days) {
        timetable[day] = [...timetable[day], { ...action.activity, id: uid('act') }];
      }
      return { ...state, timetable };
    }
    case 'updateActivity':
      return {
        ...state,
        timetable: {
          ...state.timetable,
          [action.day]: state.timetable[action.day].map((a) => (a.id === action.id ? { ...a, ...action.patch } : a)),
        },
      };
    case 'deleteActivity':
      return {
        ...state,
        timetable: { ...state.timetable, [action.day]: state.timetable[action.day].filter((a) => a.id !== action.id) },
      };
    case 'copyDay': {
      const timetable = { ...state.timetable };
      for (const day of action.to) {
        if (day === action.from) continue;
        timetable[day] = state.timetable[action.from].map((a) => ({ ...a, id: uid('act') }));
      }
      return { ...state, timetable };
    }
    case 'clearDay':
      return { ...state, timetable: { ...state.timetable, [action.day]: [] } };
    case 'resetDay':
      return { ...state, timetable: { ...state.timetable, [action.day]: defaultDay(action.day) } };
    case 'resetTimetable': {
      // Restore the original schedule and make sure the default categories exist again.
      const known = new Set(state.categories.map((c) => c.id));
      const restored = DEFAULT_CATEGORIES.filter((c) => !known.has(c.id)).map((c) => ({ ...c }));
      return { ...state, timetable: defaultTimetable(), categories: [...state.categories, ...restored] };
    }

    case 'addCategory':
      return { ...state, categories: [...state.categories, { ...action.category, id: uid('cat') }] };
    case 'updateCategory':
      return { ...state, categories: state.categories.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)) };
    case 'deleteCategory': {
      const cat = state.categories.find((c) => c.id === action.id);
      if (!cat || cat.builtIn) return state; // built-in categories drive dashboard cards
      const others = state.categories.filter((c) => c.id !== action.id);
      // Activities never end up pointing at a category that no longer exists.
      const target =
        (action.moveTo && others.some((c) => c.id === action.moveTo) ? action.moveTo : undefined) ??
        others.find((c) => c.id === 'routine')?.id ??
        others[0]?.id;
      const timetable = { ...state.timetable };
      for (const day of Object.keys(timetable).map(Number) as DayId[]) {
        timetable[day] = timetable[day].map((a) => (a.categoryId === action.id && target ? { ...a, categoryId: target } : a));
      }
      return {
        ...state,
        categories: others,
        timetable,
        goals: state.goals.map((g) => (g.categoryId === action.id ? { ...g, categoryId: undefined } : g)),
      };
    }

    case 'addGoal':
      return { ...state, goals: [...state.goals, { ...action.goal, id: uid('goal') }] };
    case 'updateGoal':
      return { ...state, goals: state.goals.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)) };
    case 'deleteGoal':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };
    case 'setProgress': {
      const value = Math.max(0, Math.round(action.value * 100) / 100);
      return {
        ...state,
        goalProgress: {
          ...state.goalProgress,
          [action.week]: { ...(state.goalProgress[action.week] ?? {}), [action.goalId]: value },
        },
      };
    }
    case 'resetWeekProgress': {
      const next = { ...state.goalProgress };
      delete next[action.week];
      return { ...state, goalProgress: next };
    }
    case 'toggleCompletion': {
      const current = state.completions[action.dateKey] ?? [];
      const next = current.includes(action.activityId)
        ? current.filter((id) => id !== action.activityId)
        : [...current, action.activityId];
      return { ...state, completions: { ...state.completions, [action.dateKey]: next } };
    }

    /* ---------------- Health & Fitness ---------------- */

    case 'saveProfile': {
      const weightKg = action.weightKg ?? action.profile.currentWeightKg;
      let weightEntries = state.health.weightEntries;
      const latest = latestWeightEntry(weightEntries);
      // A changed current weight is recorded as a NEW measurement; existing history is never edited.
      if (!latest || Math.abs(latest.kg - weightKg) > 0.001) {
        weightEntries = [
          ...weightEntries.filter((w) => w.date !== action.date),
          { id: uid('wt'), date: action.date, kg: weightKg },
        ];
      }
      return withHealth(state, { profile: { ...action.profile, currentWeightKg: weightKg }, weightEntries });
    }
    case 'saveWeight': {
      const others = state.health.weightEntries.filter((w) => w.id !== action.id && w.date !== action.date);
      const entry: WeightEntry = { id: action.id ?? uid('wt'), date: action.date, kg: action.kg, note: action.note || undefined };
      return { ...state, health: syncProfileWeight({ ...state.health, weightEntries: [...others, entry] }) };
    }
    case 'deleteWeight':
      return {
        ...state,
        health: syncProfileWeight({ ...state.health, weightEntries: state.health.weightEntries.filter((w) => w.id !== action.id) }),
      };

    case 'addMeal':
      return withHealth(state, { mealEntries: [...state.health.mealEntries, { ...action.entry, id: uid('meal') }] });
    case 'updateMeal':
      return withHealth(state, {
        mealEntries: state.health.mealEntries.map((m) => (m.id === action.id ? { ...action.entry, id: action.id } : m)),
      });
    case 'deleteMeal':
      return withHealth(state, { mealEntries: state.health.mealEntries.filter((m) => m.id !== action.id) });

    case 'addFood':
      return withHealth(state, { foods: [...state.health.foods, { ...action.food, id: uid('food'), source: 'custom' }] });
    case 'updateFood':
      // Past food-log entries keep the nutrition they were logged with.
      return withHealth(state, { foods: state.health.foods.map((f) => (f.id === action.id ? { ...f, ...action.patch } : f)) });
    case 'deleteFood':
      return withHealth(state, { foods: state.health.foods.filter((f) => f.id !== action.id || f.source === 'starter') });
    case 'restoreStarterFood': {
      const original = getStarterFood(action.id);
      if (!original) return state;
      return withHealth(state, {
        foods: state.health.foods.map((f) => (f.id === action.id ? { ...original, meals: [...original.meals], favorite: f.favorite } : f)),
      });
    }

    case 'addWater':
      return withHealth(state, { waterEntries: [...state.health.waterEntries, { ...action.entry, id: uid('water') }] });
    case 'deleteWater':
      return withHealth(state, { waterEntries: state.health.waterEntries.filter((w) => w.id !== action.id) });

    case 'addExercise':
      return withHealth(state, { exerciseEntries: [...state.health.exerciseEntries, { ...action.entry, id: uid('ex') }] });
    case 'deleteExercise':
      return withHealth(state, { exerciseEntries: state.health.exerciseEntries.filter((e) => e.id !== action.id) });

    case 'resetHealth':
      return { ...state, health: defaultHealth() };
    default:
      return state;
  }
}

/**
 * Every change bumps `rev`. The revision lets the app notice that another browser tab has
 * saved newer data, so a stale tab never overwrites it (see AppContext).
 */
export function reducer(state: AppData, action: Action): AppData {
  if (action.type === 'sync') return action.data;
  const next = apply(state, action);
  return { ...next, rev: state.rev + 1 };
}
