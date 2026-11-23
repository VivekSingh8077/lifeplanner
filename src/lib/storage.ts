import { createDefaultData, DEFAULT_CATEGORIES, defaultDay } from '../data/defaults';
import type { Activity, AppData, Category, CategoryKind, Goal, ThemePref, Timetable } from '../types';
import { DAY_IDS, isValidDateKey } from './dates';
import { sanitizeHealth } from './healthStorage';
import { parseTime } from './time';

export const STORAGE_KEY = 'mylife-planner:v1';
/** One-time copy of the stored data made before it is first upgraded to the health-enabled format. */
export const BACKUP_KEY = 'mylife-planner:v1:pre-health-backup';
/** Best-effort copy of unreadable persisted data, kept before the app falls back to defaults. */
export const RECOVERY_BACKUP_KEY = 'mylife-planner:recovery:corrupt-backup';
export const MAX_IMPORT_CHARS = 5 * 1024 * 1024;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const HEX = /^#[0-9a-f]{6}$/i;

function sanitizeCategories(raw: unknown): Category[] {
  const list: Category[] = [];
  const seen = new Set<string>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!isRecord(item) || !isString(item.id) || !isString(item.name) || seen.has(item.id)) continue;
      const fallback = DEFAULT_CATEGORIES.find((c) => c.id === item.id);
      const kind: CategoryKind =
        item.kind === 'study' || item.kind === 'productive' || item.kind === 'other' ? item.kind : 'other';
      list.push({
        id: item.id,
        name: item.name.trim() || fallback?.name || 'Untitled',
        color: isString(item.color) && HEX.test(item.color) ? item.color : fallback?.color ?? '#64748b',
        kind,
        builtIn: fallback?.builtIn ? true : undefined,
      });
      seen.add(item.id);
    }
  }
  // Built-in categories always exist because dashboard cards depend on them.
  for (const def of DEFAULT_CATEGORIES) {
    if (def.builtIn && !seen.has(def.id)) list.push({ ...def });
  }
  return list.length ? list : DEFAULT_CATEGORIES.map((c) => ({ ...c }));
}

function sanitizeActivities(raw: unknown): Activity[] {
  if (!Array.isArray(raw)) return [];
  const out: Activity[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isRecord(item) || !isString(item.name) || !isString(item.start) || !isString(item.end)) continue;
    if (parseTime(item.start) === null || parseTime(item.end) === null) continue;
    let id = isString(item.id) && item.id ? item.id : `act-${Math.random().toString(36).slice(2, 10)}`;
    if (seen.has(id)) id = `${id}-${Math.random().toString(36).slice(2, 6)}`;
    seen.add(id);
    out.push({
      id,
      name: item.name,
      categoryId: isString(item.categoryId) ? item.categoryId : 'uncategorised',
      start: item.start.trim().padStart(5, '0'),
      end: item.end.trim().padStart(5, '0'),
    });
  }
  return out;
}

function sanitizeTimetable(raw: unknown): Timetable {
  const source = isRecord(raw) ? raw : {};
  const tt = {} as Timetable;
  for (const day of DAY_IDS) {
    tt[day] = Array.isArray(source[String(day)]) ? sanitizeActivities(source[String(day)]) : defaultDay(day);
  }
  return tt;
}

function sanitizeGoals(raw: unknown, fallback: Goal[]): Goal[] {
  if (!Array.isArray(raw)) return fallback;
  const out: Goal[] = [];
  for (const item of raw) {
    if (!isRecord(item) || !isString(item.id) || !isString(item.title)) continue;
    const target = typeof item.target === 'number' && isFinite(item.target) ? Math.max(0, item.target) : 1;
    out.push({
      id: item.id,
      title: item.title,
      target,
      unit: isString(item.unit) ? item.unit : '',
      targetText: isString(item.targetText) && item.targetText ? item.targetText : undefined,
      categoryId: isString(item.categoryId) ? item.categoryId : undefined,
    });
  }
  return out;
}

function sanitizeProgress(raw: unknown): AppData['goalProgress'] {
  const out: AppData['goalProgress'] = {};
  if (!isRecord(raw)) return out;
  for (const [week, goals] of Object.entries(raw)) {
    if (!isValidDateKey(week) || !isRecord(goals)) continue;
    const row: Record<string, number> = Object.create(null) as Record<string, number>;
    for (const [goalId, value] of Object.entries(goals)) {
      if (goalId !== '__proto__' && goalId !== 'constructor' && goalId !== 'prototype' && typeof value === 'number' && isFinite(value) && value >= 0) row[goalId] = value;
    }
    Object.defineProperty(out, week, { value: row, enumerable: true, configurable: true, writable: true });
  }
  return out;
}

function sanitizeCompletions(raw: unknown): AppData['completions'] {
  const out: AppData['completions'] = Object.create(null) as AppData['completions'];
  if (!isRecord(raw)) return out;
  for (const [date, ids] of Object.entries(raw)) {
    if (isValidDateKey(date) && Array.isArray(ids)) Object.defineProperty(out, date, { value: ids.filter(isString), enumerable: true, configurable: true, writable: true });
  }
  return out;
}

export interface SanitizeResult {
  data: AppData;
  /** False for files / stored data created before the Health module existed. */
  includesHealth: boolean;
}

/**
 * Build a clean AppData from anything (stored data, an imported file, old versions).
 * Version 1 data (no `health`) is migrated by adding an empty health module; nothing else is touched.
 * Throws if the value does not look like planner data at all.
 */
export function migrateData(input: unknown): SanitizeResult {
  let raw = input;
  if (isRecord(raw) && isRecord(raw.data) && (raw.app === 'mylife-planner' || 'timetable' in raw.data)) {
    raw = raw.data;
  }
  if (!isRecord(raw) || !('timetable' in raw || 'categories' in raw || 'goals' in raw || 'health' in raw)) {
    throw new Error('This does not look like a MyLife Planner export.');
  }
  const defaults = createDefaultData();
  const theme: ThemePref = raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'system' ? raw.theme : 'system';
  const includesHealth = isRecord(raw.health);
  return {
    includesHealth,
    data: {
      version: 2,
      rev: typeof raw.rev === 'number' && Number.isFinite(raw.rev) && raw.rev >= 0 ? Math.floor(raw.rev) : 0,
      theme,
      use24h: typeof raw.use24h === 'boolean' ? raw.use24h : false,
      categories: sanitizeCategories(raw.categories),
      timetable: sanitizeTimetable(raw.timetable),
      goals: sanitizeGoals(raw.goals, defaults.goals),
      goalProgress: sanitizeProgress(raw.goalProgress),
      completions: sanitizeCompletions(raw.completions),
      health: sanitizeHealth(raw.health),
    },
  };
}

/** Convenience wrapper returning just the data. */
export function sanitizeData(input: unknown): AppData {
  return migrateData(input).data;
}

export function loadData(): { data: AppData; storageOk: boolean } {
  let originalText: string | null = null;
  try {
    originalText = localStorage.getItem(STORAGE_KEY);
    if (!originalText) return { data: createDefaultData(), storageOk: true };
    const parsed: unknown = JSON.parse(originalText);
    const { data, includesHealth } = migrateData(parsed);
    if (!includesHealth) {
      // First run after upgrading from the planner-only format: keep an untouched copy of the old data.
      try {
        if (!localStorage.getItem(BACKUP_KEY)) localStorage.setItem(BACKUP_KEY, originalText);
      } catch {
        /* backup is best-effort */
      }
    }
    return { data, storageOk: true };
  } catch (error) {
    // Preserve unreadable data before a later save of defaults can overwrite it.
    if (originalText) {
      try {
        if (!localStorage.getItem(RECOVERY_BACKUP_KEY)) {
          localStorage.setItem(RECOVERY_BACKUP_KEY, originalText);
        }
      } catch {
        /* recovery copy is best-effort when storage is blocked or full */
      }
    }
    // Corrupt data or storage blocked: start from defaults rather than crashing.
    console.warn('MyLife Planner: could not load saved data', error);
    let ok = true;
    try {
      localStorage.setItem('mylife-planner:probe', '1');
      localStorage.removeItem('mylife-planner:probe');
    } catch {
      ok = false;
    }
    return { data: createDefaultData(), storageOk: ok };
  }
}

export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn('MyLife Planner: could not save data', error);
    return false;
  }
}

export function clearStoredData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function exportJson(data: AppData): string {
  return JSON.stringify({ app: 'mylife-planner', version: 2, exportedAt: new Date().toISOString(), data }, null, 2);
}

export function parseImport(text: string): SanitizeResult {
  if (text.length > MAX_IMPORT_CHARS) throw new Error('This backup is larger than 5 MB. Split or reduce the file before importing.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That is not valid JSON.');
  }
  return migrateData(parsed);
}
