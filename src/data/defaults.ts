import type { Activity, AppData, Category, DayId, Goal, HealthData, Timetable } from '../types';
import { cloneStarterFoods } from './starterFoods';

/**
 * Default data for MyLife Planner. Nothing in the UI hardcodes the schedule:
 * everything is read from the data model that is persisted in localStorage.
 */

let counter = 0;
export function uid(prefix = 'id'): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}${counter}`;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'dsa', name: 'DSA', color: '#3b82f6', kind: 'study', builtIn: true },
  { id: 'development', name: 'Development', color: '#6366f1', kind: 'study', builtIn: true },
  { id: 'cs', name: 'CS Fundamentals', color: '#06b6d4', kind: 'study', builtIn: true },
  { id: 'academics', name: 'Academics', color: '#22c55e', kind: 'study', builtIn: true },
  { id: 'japanese', name: 'Japanese', color: '#a855f7', kind: 'study', builtIn: true },
  { id: 'youtube', name: 'YouTube', color: '#ef4444', kind: 'productive', builtIn: true },
  { id: 'entertainment', name: 'Gaming / Entertainment', color: '#f97316', kind: 'other' },
  { id: 'college', name: 'College', color: '#14b8a6', kind: 'other' },
  { id: 'meals', name: 'Meals', color: '#f59e0b', kind: 'other' },
  { id: 'sleep', name: 'Sleep', color: '#64748b', kind: 'other' },
  { id: 'break', name: 'Break', color: '#a8a29e', kind: 'other' },
  { id: 'routine', name: 'Routine', color: '#0ea5e9', kind: 'other' },
  { id: 'free', name: 'Free time', color: '#ec4899', kind: 'other' },
  { id: 'planning', name: 'Planning', color: '#84cc16', kind: 'other' },
];

/** Hex colours offered when creating a custom category. */
export const COLOR_CHOICES = [
  '#3b82f6',
  '#6366f1',
  '#06b6d4',
  '#22c55e',
  '#a855f7',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#64748b',
  '#14b8a6',
  '#ec4899',
  '#84cc16',
  '#0ea5e9',
  '#e11d48',
  '#a8a29e',
  '#8b5cf6',
];

type Row = [start: string, end: string, name: string, categoryId: string];

function build(rows: Row[]): Activity[] {
  return rows.map(([start, end, name, categoryId]) => ({
    id: uid('act'),
    name,
    categoryId,
    start,
    end,
  }));
}

const WEEKDAY_ROWS: Row[] = [
  ['06:30', '06:45', 'Wake up and freshen up', 'routine'],
  ['06:45', '08:00', 'DSA / Placement preparation', 'dsa'],
  ['08:00', '08:30', 'Breakfast', 'meals'],
  ['08:30', '09:15', 'Get ready and commute', 'routine'],
  ['09:30', '17:00', 'College', 'college'],
  ['17:00', '18:00', 'Rest and snacks', 'break'],
  ['18:00', '19:15', 'Development / CS fundamentals', 'development'],
  ['19:30', '20:00', 'Dinner', 'meals'],
  ['20:00', '20:45', 'Academic revision', 'academics'],
  ['20:45', '21:15', 'Japanese', 'japanese'],
  ['21:15', '22:15', 'YouTube / Gaming / Relaxation', 'entertainment'],
  ['22:15', '23:00', 'Free time and prepare for tomorrow', 'routine'],
  ['23:00', '23:30', 'Wind down', 'routine'],
  ['23:30', '06:30', 'Sleep', 'sleep'],
];

const SATURDAY_ROWS: Row[] = [
  ['06:30', '07:00', 'Wake up', 'routine'],
  ['07:00', '09:00', 'DSA practice', 'dsa'],
  ['09:00', '09:30', 'Breakfast', 'meals'],
  ['09:30', '10:00', 'Break', 'break'],
  ['10:00', '11:30', 'Development', 'development'],
  ['11:30', '13:00', 'Gaming / Relaxation', 'entertainment'],
  ['13:00', '14:00', 'Lunch', 'meals'],
  ['14:00', '16:00', 'YouTube production', 'youtube'],
  ['16:00', '17:00', 'Break', 'break'],
  ['17:00', '18:00', 'Academic revision', 'academics'],
  ['18:00', '19:30', 'Free time', 'free'],
  ['19:30', '20:00', 'Dinner', 'meals'],
  ['20:15', '20:45', 'Japanese', 'japanese'],
  // "8:45 PM onwards" – runs until midnight by default; edit as you like.
  ['20:45', '00:00', 'Gaming / Movies / Relaxation', 'entertainment'],
];

const SUNDAY_ROWS: Row[] = [
  ['06:30', '07:00', 'Wake up', 'routine'],
  ['07:00', '08:30', 'DSA revision', 'dsa'],
  ['08:30', '09:00', 'Breakfast', 'meals'],
  ['09:00', '09:30', 'Break', 'break'],
  ['09:30', '11:30', 'Development / Project', 'development'],
  ['11:30', '13:00', 'Gaming', 'entertainment'],
  ['13:00', '14:30', 'Lunch and rest', 'meals'],
  ['14:30', '16:00', 'Academics / Assignments', 'academics'],
  ['16:00', '16:30', 'Japanese', 'japanese'],
  ['16:30', '17:30', 'YouTube planning', 'youtube'],
  ['17:30', '19:30', 'Free time', 'free'],
  ['19:30', '20:00', 'Dinner', 'meals'],
  ['20:00', '20:30', 'Plan next week', 'planning'],
  ['20:30', '00:00', 'Relaxation', 'entertainment'],
];

export function defaultDay(day: DayId): Activity[] {
  if (day === 5) return build(SATURDAY_ROWS);
  if (day === 6) return build(SUNDAY_ROWS);
  return build(WEEKDAY_ROWS);
}

export function defaultTimetable(): Timetable {
  return {
    0: defaultDay(0),
    1: defaultDay(1),
    2: defaultDay(2),
    3: defaultDay(3),
    4: defaultDay(4),
    5: defaultDay(5),
    6: defaultDay(6),
  };
}

export function defaultGoals(): Goal[] {
  return [
    { id: 'goal-dsa', title: 'DSA problems', target: 10, unit: 'problems', targetText: '10–12 problems', categoryId: 'dsa' },
    { id: 'goal-dev', title: 'Development', target: 3, unit: 'sessions', targetText: '3 sessions', categoryId: 'development' },
    { id: 'goal-cs', title: 'CS Fundamentals', target: 2, unit: 'topics', targetText: '2 topics', categoryId: 'cs' },
    {
      id: 'goal-academics',
      title: 'Academic revision',
      target: 5,
      unit: 'subjects',
      targetText: 'All college subjects',
      categoryId: 'academics',
    },
    { id: 'goal-japanese', title: 'Japanese', target: 5, unit: 'sessions', targetText: '5 sessions', categoryId: 'japanese' },
    {
      id: 'goal-youtube',
      title: 'YouTube',
      target: 1,
      unit: 'milestone',
      targetText: 'One production milestone',
      categoryId: 'youtube',
    },
    {
      id: 'goal-planning',
      title: 'Weekly planning',
      target: 1,
      unit: 'plan',
      targetText: 'Every Sunday',
      categoryId: 'planning',
    },
  ];
}

export function defaultHealth(): HealthData {
  return {
    profile: null,
    weightEntries: [],
    foods: cloneStarterFoods(),
    mealEntries: [],
    exerciseEntries: [],
    waterEntries: [],
  };
}

export function createDefaultData(): AppData {
  return {
    version: 2,
    rev: 0,
    theme: 'system',
    use24h: false,
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    timetable: defaultTimetable(),
    goals: defaultGoals(),
    goalProgress: {},
    completions: {},
    health: defaultHealth(),
  };
}
