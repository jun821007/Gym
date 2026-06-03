import { bodyTypeFromRecord } from "@/lib/body-type";
import type { InbodyRecord, SettlementManualLog, UserProfile, WorkoutLog } from "./types";

export function toSettlementLogs(logs: WorkoutLog[]): SettlementManualLog[] {
  return logs.map((w) => ({
    exerciseName: w.exerciseName,
    weightKg: w.weightKg,
    reps: w.reps,
    sets: w.sets,
  }));
}

export function calcTotalVolumeKg(logs: SettlementManualLog[]): number {
  return logs.reduce((sum, w) => sum + w.weightKg * w.reps * w.sets, 0);
}

export function formatLogsForApi(logs: WorkoutLog[]) {
  return logs.map((w) => ({
    name: w.exerciseName,
    weight: w.weightKg,
    reps: w.reps,
    sets: w.sets,
    volume: w.weightKg * w.reps * w.sets,
  }));
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
