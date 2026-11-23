import type { DayId } from '../types';

export const DAY_IDS: DayId[] = [0, 1, 2, 3, 4, 5, 6];
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** JS getDay() (0 = Sunday) -> our DayId (0 = Monday). */
export function dayIdFromDate(date: Date): DayId {
  return ((date.getDay() + 6) % 7) as DayId;
}

export function previousDay(day: DayId): DayId {
  return ((day + 6) % 7) as DayId;
}

export function nextDay(day: DayId): DayId {
  return ((day + 1) % 7) as DayId;
}

const pad = (n: number) => n.toString().padStart(2, '0');

/** Strictly validate a local ISO date key without accepting rollover dates such as 2026-02-31. */
export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Local date as YYYY-MM-DD. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - dayIdFromDate(d));
  return d;
}

/** Key identifying the week (its Monday) for goal progress. */
export function weekKey(date: Date): string {
  return toDateKey(startOfWeek(date));
}

/** The calendar date of a weekday within the week containing `ref`. */
export function dateForDay(day: DayId, ref: Date): Date {
  const monday = startOfWeek(ref);
  monday.setDate(monday.getDate() + day);
  return monday;
}

export function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatWeekRange(ref: Date): string {
  const start = startOfWeek(ref);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}
