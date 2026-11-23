import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { createDefaultData } from '../data/defaults';
import { clearStoredData, loadData, migrateData, saveData, STORAGE_KEY } from '../lib/storage';
import type {
  Activity,
  AppData,
  Category,
  DayId,
  ExerciseEntry,
  FoodItem,
  Goal,
  HealthProfile,
  MealEntry,
  ThemePref,
  WaterEntry,
} from '../types';
import { reducer, type Action } from './reducer';

export interface AppActions {
  setTheme: (theme: ThemePref) => void;
  setUse24h: (value: boolean) => void;
  addActivity: (days: DayId[], activity: Omit<Activity, 'id'>) => void;
  updateActivity: (day: DayId, id: string, patch: Partial<Omit<Activity, 'id'>>) => void;
  deleteActivity: (day: DayId, id: string) => void;
  copyDay: (from: DayId, to: DayId[]) => void;
  clearDay: (day: DayId) => void;
  resetDay: (day: DayId) => void;
  resetTimetable: () => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id' | 'builtIn'>>) => void;
  /** Activities using the category are moved to `moveTo` (or a sensible default). */
  deleteCategory: (id: string, moveTo?: string) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, patch: Partial<Omit<Goal, 'id'>>) => void;
  deleteGoal: (id: string) => void;
  setProgress: (week: string, goalId: string, value: number) => void;
  resetWeekProgress: (week: string) => void;
  toggleCompletion: (dateKey: string, activityId: string) => void;
  importData: (data: AppData) => void;
  resetAll: () => void;
  // ---- Health & Fitness ----
  saveProfile: (profile: HealthProfile, weightKg: number | null, date: string) => void;
  saveWeight: (entry: { id?: string; date: string; kg: number; note?: string }) => void;
  deleteWeight: (id: string) => void;
  addMeal: (entry: Omit<MealEntry, 'id'>) => void;
  updateMeal: (id: string, entry: Omit<MealEntry, 'id'>) => void;
  deleteMeal: (id: string) => void;
  addFood: (food: Omit<FoodItem, 'id' | 'source'>) => void;
  updateFood: (id: string, patch: Partial<Omit<FoodItem, 'id' | 'source'>>) => void;
  deleteFood: (id: string) => void;
  restoreStarterFood: (id: string) => void;
  addWater: (entry: Omit<WaterEntry, 'id'>) => void;
  deleteWater: (id: string) => void;
  addExercise: (entry: Omit<ExerciseEntry, 'id'>) => void;
  deleteExercise: (id: string) => void;
  resetHealth: () => void;
}

interface AppContextValue {
  data: AppData;
  actions: AppActions;
  /** False when the browser refuses to store data (private mode, blocked storage). */
  storageOk: boolean;
  isDark: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Data saved by another tab, if it is newer than `knownRev`. */
function readNewerStored(knownRev: number): AppData | null {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return null;
    const stored = migrateData(JSON.parse(text)).data;
    return stored.rev > knownRev ? stored : null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadData());
  const [data, rawDispatch] = useReducer(reducer, initial.current.data);
  const [storageOk, setStorageOk] = useState(initial.current.storageOk);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  /** Revision the in-memory state will have once every dispatched action has been applied. */
  const knownRev = useRef(initial.current.data.rev);
  /** Revision last written to (or read from) localStorage. */
  const savedRev = useRef(initial.current.data.rev);

  /**
   * Multi-tab safety. Before applying a change we check whether another tab saved newer data;
   * if so we adopt it first and apply the change on top of it, so edits made concurrently in two
   * tabs are merged action-by-action instead of one tab overwriting the other.
   */
  const dispatch = useCallback((action: Action) => {
    const newer = readNewerStored(knownRev.current);
    if (newer) {
      knownRev.current = newer.rev;
      savedRev.current = newer.rev;
      rawDispatch({ type: 'sync', data: newer });
    }
    rawDispatch(action);
    knownRev.current += 1; // the reducer bumps the revision by exactly one per action
  }, []);

  // Persist every change automatically.
  useEffect(() => {
    if (data.rev === savedRev.current) return;
    savedRev.current = data.rev;
    setStorageOk(saveData(data));
  }, [data]);

  // Pick up changes saved by other tabs while this one is idle.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const incoming = migrateData(JSON.parse(e.newValue)).data;
        if (incoming.rev <= knownRev.current) return;
        knownRev.current = incoming.rev;
        savedRev.current = incoming.rev; // already stored; don't write it back
        rawDispatch({ type: 'sync', data: incoming });
      } catch {
        /* ignore malformed writes */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Follow the system theme when the preference is "system".
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isDark = data.theme === 'dark' || (data.theme === 'system' && systemDark);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  const actions = useMemo<AppActions>(
    () => ({
      setTheme: (theme) => dispatch({ type: 'setTheme', theme }),
      setUse24h: (value) => dispatch({ type: 'setUse24h', value }),
      addActivity: (days, activity) => dispatch({ type: 'addActivity', days, activity }),
      updateActivity: (day, id, patch) => dispatch({ type: 'updateActivity', day, id, patch }),
      deleteActivity: (day, id) => dispatch({ type: 'deleteActivity', day, id }),
      copyDay: (from, to) => dispatch({ type: 'copyDay', from, to }),
      clearDay: (day) => dispatch({ type: 'clearDay', day }),
      resetDay: (day) => dispatch({ type: 'resetDay', day }),
      resetTimetable: () => dispatch({ type: 'resetTimetable' }),
      addCategory: (category) => dispatch({ type: 'addCategory', category }),
      updateCategory: (id, patch) => dispatch({ type: 'updateCategory', id, patch }),
      deleteCategory: (id, moveTo) => dispatch({ type: 'deleteCategory', id, moveTo }),
      addGoal: (goal) => dispatch({ type: 'addGoal', goal }),
      updateGoal: (id, patch) => dispatch({ type: 'updateGoal', id, patch }),
      deleteGoal: (id) => dispatch({ type: 'deleteGoal', id }),
      setProgress: (week, goalId, value) => dispatch({ type: 'setProgress', week, goalId, value }),
      resetWeekProgress: (week) => dispatch({ type: 'resetWeekProgress', week }),
      toggleCompletion: (dateKey, activityId) => dispatch({ type: 'toggleCompletion', dateKey, activityId }),
      importData: (incoming) => dispatch({ type: 'replace', data: incoming }),
      resetAll: () => {
        clearStoredData();
        dispatch({ type: 'replace', data: createDefaultData() });
      },
      saveProfile: (profile, weightKg, date) => dispatch({ type: 'saveProfile', profile, weightKg, date }),
      saveWeight: (entry) => dispatch({ type: 'saveWeight', ...entry }),
      deleteWeight: (id) => dispatch({ type: 'deleteWeight', id }),
      addMeal: (entry) => dispatch({ type: 'addMeal', entry }),
      updateMeal: (id, entry) => dispatch({ type: 'updateMeal', id, entry }),
      deleteMeal: (id) => dispatch({ type: 'deleteMeal', id }),
      addFood: (food) => dispatch({ type: 'addFood', food }),
      updateFood: (id, patch) => dispatch({ type: 'updateFood', id, patch }),
      deleteFood: (id) => dispatch({ type: 'deleteFood', id }),
      restoreStarterFood: (id) => dispatch({ type: 'restoreStarterFood', id }),
      addWater: (entry) => dispatch({ type: 'addWater', entry }),
      deleteWater: (id) => dispatch({ type: 'deleteWater', id }),
      addExercise: (entry) => dispatch({ type: 'addExercise', entry }),
      deleteExercise: (id) => dispatch({ type: 'deleteExercise', id }),
      resetHealth: () => dispatch({ type: 'resetHealth' }),
    }),
    [dispatch],
  );

  const value = useMemo(() => ({ data, actions, storageOk, isDark }), [data, actions, storageOk, isDark]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
