import { bodyTypeFromRecord } from "@/lib/body-type";
import {
  buildSettlementSetLines,
  calcLogVolume,
  effectiveSetWeightKg,
  getLatestBodyWeightKg,
  normalizeSetDetails,
  toSettlementWeight,
} from "@/lib/workout-volume";
import type { SettlementManualLog, UserProfile, WorkoutLog } from "./types";

function workoutToSettlementLog(
  w: WorkoutLog,
  bodyWeightKg: number | null,
): SettlementManualLog {
  const sets = normalizeSetDetails(w);
  const setLines = buildSettlementSetLines(w, bodyWeightKg);
  const volumeKg = calcLogVolume(w, bodyWeightKg);
  const totalReps = sets.reduce((s, x) => s + x.reps, 0);

  return {
    exerciseName: w.exerciseName,
    weightKg: toSettlementWeight(w, bodyWeightKg),
    reps: sets.length
      ? Math.round(totalReps / sets.length)
      : w.reps,
    sets: sets.length || w.sets,
    setLines,
    volumeKg: Math.round(volumeKg * 10) / 10,
    loadType: w.loadType,
  };
}

export function toSettlementLogs(
  logs: WorkoutLog[],
  bodyWeightKg: number | null = null,
): SettlementManualLog[] {
  return logs.map((w) => workoutToSettlementLog(w, bodyWeightKg));
}

export function settlementLogVolume(log: SettlementManualLog): number {
  if (log.volumeKg != null) return log.volumeKg;
  if (log.setLines?.length) {
    return log.setLines.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
  }
  return log.weightKg * log.reps * log.sets;
}

export function calcTotalVolumeKg(
  logs: SettlementManualLog[] | WorkoutLog[],
  bodyWeightKg: number | null = null,
): number {
  if (logs.length === 0) return 0;
  const first = logs[0] as WorkoutLog;
  if ("loadType" in first) {
    return (logs as WorkoutLog[]).reduce(
      (sum, w) => sum + calcLogVolume(w, bodyWeightKg),
      0,
    );
  }
  return (logs as SettlementManualLog[]).reduce(
    (sum, w) => sum + settlementLogVolume(w),
    0,
  );
}

export function formatLogsForApi(logs: WorkoutLog[], bodyWeightKg: number | null = null) {
  return logs.map((w) => {
    const entry = workoutToSettlementLog(w, bodyWeightKg);
    const sets = normalizeSetDetails(w);
    return {
      name: w.exerciseName,
      weight: entry.weightKg,
      reps: entry.reps,
      sets: entry.sets,
      volume: entry.volumeKg,
      load_type: w.loadType,
      set_lines: sets.map((s) => ({
        weight:
          Math.round(effectiveSetWeightKg(w, s, bodyWeightKg) * 10) / 10,
        reps: s.reps,
      })),
    };
  });
}

/** 從 profile 取出最新體態，供訓練評分用 */
export function buildBodyMetricsPayload(
  profile: UserProfile,
  todayVolume: number,
) {
  const latest = profile.inbodyHistory.at(-1);
  if (!latest?.weight_kg) return null;

  const weight = latest.weight_kg;
  const fat = latest.body_fat_pct ?? 0;
  const muscle =
    latest.skeletal_muscle_kg ??
    Math.round(weight * (1 - fat / 100) * 0.52 * 10) / 10;
  const bodyType = bodyTypeFromRecord(latest);
  const volumePerKg =
    weight > 0 ? Math.round((todayVolume / weight) * 10) / 10 : 0;

  return {
    weight_kg: weight,
    body_fat_pct: fat,
    skeletal_muscle_kg: muscle,
    bmi: latest.bmi,
    body_type: bodyType?.code ?? null,
    body_type_label: bodyType ? `${bodyType.label} ${bodyType.title}` : null,
    today_volume_total: todayVolume,
    volume_per_body_weight: volumePerKg,
    /** 相對訓練量門檻參考（依體重個人化） */
    volume_per_kg_benchmarks: {
      excellent: Math.round(weight * 1.2),
      good: Math.round(weight * 0.9),
      low: Math.round(weight * 0.6),
    },
    /** 動態大卡/體重 建議門檻 (kcal per kg) */
    kcal_per_kg_benchmarks: { excellent: 4.5, good: 3.2, low: 2 },
  };
}
