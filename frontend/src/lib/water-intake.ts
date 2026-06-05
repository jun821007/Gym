import { isToday, toDateKey } from "./datetime";

const STORAGE_KEY = "water-intake-v1";

export const DEFAULT_WATER_GOAL_ML = 2000;

export const WATER_QUICK_ML = [200, 250, 300, 500] as const;

export interface WaterIntakeSettings {
  dailyGoalMl: number;
}

export interface WaterLogEntry {
  id: string;
  amountMl: number;
  logDate: string;
  loggedAt: string;
}

interface WaterStorage {
  settings: WaterIntakeSettings;
  entries: WaterLogEntry[];
}

function defaultStorage(): WaterStorage {
  return {
    settings: { dailyGoalMl: DEFAULT_WATER_GOAL_ML },
    entries: [],
  };
}

export function loadWaterStorage(): WaterStorage {
  if (typeof window === "undefined") return defaultStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStorage();
    const parsed = JSON.parse(raw) as Partial<WaterStorage>;
    return {
      settings: {
        dailyGoalMl:
          parsed.settings?.dailyGoalMl ?? DEFAULT_WATER_GOAL_ML,
      },
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return defaultStorage();
  }
}

export function saveWaterStorage(data: WaterStorage) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveWaterGoal(dailyGoalMl: number): WaterIntakeSettings {
  const data = loadWaterStorage();
  const settings = {
    dailyGoalMl: clampGoal(dailyGoalMl),
  };
  saveWaterStorage({ ...data, settings });
  return settings;
}

export function addWaterEntry(amountMl: number): {
  entry: WaterLogEntry;
  entries: WaterLogEntry[];
} {
  const ml = Math.round(Math.max(0, Math.min(5000, amountMl)));
  if (ml <= 0) throw new Error("請輸入大於 0 的毫升數");

  const now = new Date();
  const entry: WaterLogEntry = {
    id: crypto.randomUUID(),
    amountMl: ml,
    logDate: toDateKey(now),
    loggedAt: now.toISOString(),
  };

  const data = loadWaterStorage();
  const entries = [entry, ...data.entries];
  saveWaterStorage({ ...data, entries });
  return { entry, entries };
}

export function getTodayWaterEntries(entries: WaterLogEntry[]): WaterLogEntry[] {
  return getWaterEntriesForDate(entries, toDateKey());
}

export function getWaterEntriesForDate(
  entries: WaterLogEntry[],
  dateKey: string,
): WaterLogEntry[] {
  return entries
    .filter((e) => e.logDate === dateKey || toDateKey(new Date(e.loggedAt)) === dateKey)
    .sort(
      (a, b) =>
        new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
    );
}

export function sumWaterMl(entries: WaterLogEntry[]): number {
  return entries.reduce((sum, e) => sum + e.amountMl, 0);
}

export function waterProgressPct(currentMl: number, goalMl: number): number {
  if (goalMl <= 0) return 0;
  return Math.min(100, Math.round((currentMl / goalMl) * 100));
}

function clampGoal(ml: number): number {
  return Math.min(10000, Math.max(500, Math.round(ml)));
}
