import { Mode } from '../types';

export type TrialArea = 'mode' | 'elite';

const STORAGE_KEY = 'ucmas_trial_usage_v1';

type Stored = Record<
  string,
  Partial<Record<TrialArea, Partial<Record<string, number>>>>
>;

function safeParse(raw: string | null): Stored {
  try {
    return raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    return {};
  }
}

function loadAll(): Stored {
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

function saveAll(all: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function getTrialCount(userId: string, area: TrialArea, mode: Mode): number {
  const all = loadAll();
  const u = all[userId] || {};
  const a = u[area] || {};
  const v = a[mode] || 0;
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export function canUseTrial(userId: string, area: TrialArea, mode: Mode, limit: number): boolean {
  if (!userId) return false;
  if (!limit || limit <= 0) return false;
  return getTrialCount(userId, area, mode) < limit;
}

/** Increments and returns the new count. */
export function consumeTrial(userId: string, area: TrialArea, mode: Mode): number {
  const all = loadAll();
  if (!all[userId]) all[userId] = {};
  if (!all[userId]![area]) all[userId]![area] = {};
  const prev = getTrialCount(userId, area, mode);
  const next = prev + 1;
  (all[userId]![area] as any)[mode] = next;
  saveAll(all);
  return next;
}

