import {
  effectiveSetWeightKg,
  formatKg,
  normalizeSetDetails,
} from "@/lib/workout-volume";
import type { WorkoutLog } from "@/lib/types";

export interface ExerciseSetStat {
  weightKg: number;
  reps: number;
}

export interface ExerciseHistoryStats {
  max: ExerciseSetStat;
  common: ExerciseSetStat;
}

function extractSets(
  log: WorkoutLog,
  bodyWeightKg: number | null,
): ExerciseSetStat[] {
  return normalizeSetDetails(log).map((s) => ({
    weightKg: effectiveSetWeightKg(log, s, bodyWeightKg),
    reps: s.reps,
  }));
}

function compareSets(a: ExerciseSetStat, b: ExerciseSetStat): number {
  if (b.weightKg !== a.weightKg) return b.weightKg - a.weightKg;
  return b.reps - a.reps;
}

function setKey(set: ExerciseSetStat): string {
  return `${formatKg(set.weightKg)}|${set.reps}`;
}

function parseSetKey(key: string): ExerciseSetStat {
  const [w, r] = key.split("|");
  return { weightKg: Number(w) || 0, reps: Number(r) || 0 };
}

export function formatExerciseSetStat(set: ExerciseSetStat): string {
  if (set.weightKg > 0) return `${formatKg(set.weightKg)}kg×${set.reps}`;
  return `${set.reps}次`;
}

/** 歷史最高 + 最近 5 次紀錄中最常見的重量×次數 */
export function getExerciseHistoryStats(
  workouts: WorkoutLog[],
  exerciseName: string,
  bodyWeightKg: number | null,
  lastN = 5,
): ExerciseHistoryStats | null {
  const needle = exerciseName.trim().toLowerCase();
  if (!needle) return null;

  const matched = workouts.filter(
    (w) => w.exerciseName.trim().toLowerCase() === needle,
  );
  if (matched.length === 0) return null;

  const sorted = [...matched].sort((a, b) => {
    if (a.logDate !== b.logDate) return b.logDate.localeCompare(a.logDate);
    return new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime();
  });

  let max: ExerciseSetStat | null = null;
  for (const log of matched) {
    for (const set of extractSets(log, bodyWeightKg)) {
      if (!max || compareSets(set, max) < 0) max = set;
    }
  }
  if (!max) return null;

  const freq = new Map<string, number>();
  for (const log of sorted.slice(0, lastN)) {
    for (const set of extractSets(log, bodyWeightKg)) {
      const key = setKey(set);
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }

  let commonKey = setKey(max);
  let bestCount = 0;
  for (const [key, count] of freq) {
    if (count > bestCount) {
      bestCount = count;
      commonKey = key;
    }
  }

  return { max, common: parseSetKey(commonKey) };
}
