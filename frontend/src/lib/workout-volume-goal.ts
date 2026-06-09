import { toDateKey } from "@/lib/datetime";
import { calcTotalVolumeKg } from "@/lib/workout-grading";
import type { DailyWorkoutSettlement, WorkoutLog } from "@/lib/types";

export const DEFAULT_WORKOUT_VOLUME_GOAL_KG = 3000;
export const MIN_WORKOUT_VOLUME_GOAL_KG = 500;
export const MAX_WORKOUT_VOLUME_GOAL_KG = 50000;
export const SUGGESTION_WINDOW_DAYS = 28;
export const MIN_DAYS_FOR_SUGGESTION = 3;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function roundVolumeGoalKg(value: number): number {
  return Math.max(100, Math.round(value / 100) * 100);
}

function cutoffDateKey(windowDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - windowDays);
  return toDateKey(d);
}

/** 每日訓練量（優先結算快照，否則加總打卡） */
export function collectDailyVolumes(
  workouts: WorkoutLog[],
  settlements: DailyWorkoutSettlement[],
  bodyWeightKg: number | null,
  windowDays = SUGGESTION_WINDOW_DAYS,
): number[] {
  const after = cutoffDateKey(windowDays);
  const byDate = new Map<string, number>();

  for (const s of settlements) {
    if (s.logDate < after) continue;
    const vol = s.totalVolumeKg ?? 0;
    if (vol > 0) byDate.set(s.logDate, vol);
  }

  const grouped = new Map<string, WorkoutLog[]>();
  for (const w of workouts) {
    if (w.logDate < after) continue;
    const list = grouped.get(w.logDate) ?? [];
    list.push(w);
    grouped.set(w.logDate, list);
  }

  for (const [dateKey, logs] of grouped) {
    if (byDate.has(dateKey)) continue;
    const vol = calcTotalVolumeKg(logs, bodyWeightKg);
    if (vol > 0) byDate.set(dateKey, vol);
  }

  return [...byDate.values()];
}

/** 算法 D：有中位數基礎時依體重個人化，否則絕對量中位數 */
export function suggestWorkoutVolumeGoalKg(
  workouts: WorkoutLog[],
  settlements: DailyWorkoutSettlement[],
  bodyWeightKg: number | null,
): number | null {
  const volumes = collectDailyVolumes(
    workouts,
    settlements,
    bodyWeightKg,
    SUGGESTION_WINDOW_DAYS,
  );
  if (volumes.length < MIN_DAYS_FOR_SUGGESTION) return null;

  let raw: number;
  if (bodyWeightKg != null && bodyWeightKg > 0) {
    const relatives = volumes.map((v) => v / bodyWeightKg);
    raw = median(relatives) * bodyWeightKg;
  } else {
    raw = median(volumes);
  }

  return roundVolumeGoalKg(raw);
}

export function effectiveWorkoutVolumeGoalKg(
  userGoalKg: number | null | undefined,
  suggestedKg: number | null,
): number {
  if (userGoalKg != null && userGoalKg > 0) return userGoalKg;
  if (suggestedKg != null && suggestedKg > 0) return suggestedKg;
  return DEFAULT_WORKOUT_VOLUME_GOAL_KG;
}

export function workoutVolumeProgressPct(
  currentKg: number,
  goalKg: number,
): number {
  if (goalKg <= 0) return 0;
  return Math.round((currentKg / goalKg) * 100);
}
