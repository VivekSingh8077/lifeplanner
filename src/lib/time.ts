export const MINUTES_IN_DAY = 1440;

const pad = (n: number) => n.toString().padStart(2, '0');

/** Parse "HH:MM" (24h) into minutes since midnight, or null if invalid. */
export function parseTime(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutes since midnight -> "HH:MM" (24h, wraps around midnight). */
export function toTimeString(minutes: number): string {
  const m = ((Math.round(minutes) % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** Format minutes since midnight for display. */
export function formatClock(minutes: number, use24h: boolean): string {
  const m = ((Math.round(minutes) % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (use24h) return `${pad(h)}:${pad(mm)}`;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(mm)} ${suffix}`;
}

/** Format an "HH:MM" string for display (falls back to the raw value if invalid). */
export function formatTimeString(value: string, use24h: boolean): string {
  const m = parseTime(value);
  return m === null ? value : formatClock(m, use24h);
}

/** 75 -> "1h 15m", 45 -> "45m", 120 -> "2h". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total === 0) return '0m';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  return h ? `${h}h` : `${m}m`;
}

/** 450 -> "7.5h" (one decimal at most). */
export function formatHours(minutes: number): string {
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours}h`;
}

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/** Current local time as minutes since midnight. */
export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}
