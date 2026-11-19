import { getLatestInbodyRecord } from "@/lib/nutrition-goals";
import type {
  SettlementSetLine,
  UserProfile,
  WorkoutLoadType,
  WorkoutLog,
  WorkoutSetDetail,
} from "@/lib/types";

export const BODYWEIGHT_FACTOR = 0.95;

export function formatKg(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function parseWeightKgInput(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 10) / 10;
}

export const GEAR_LABELS: Record<string, string> = {
  strap: "拉力帶",
  belt: "護腰",
  knee: "護膝",
  wrist: "護腕",
};

/** 依 recorded_at 取最新 InBody 體重（避免 history 順序不穩） */
export function getLatestBodyWeightKg(profile: UserProfile): number | null {
  const w = getLatestInbodyRecord(profile.inbodyHistory)?.weight_kg;
  return w != null && w > 0 ? w : null;
}

/** 有效自重（體重 × 0.95），顯示用四捨五入到 0.1 */
export function effectiveBodyWeightKg(bodyWeightKg: number | null): number | null {
  if (bodyWeightKg == null || bodyWeightKg <= 0) return null;
  return Math.round(bodyWeightKg * BODYWEIGHT_FACTOR * 10) / 10;
}

/** 資料庫儲存的單組重量（單邊／雙邊為使用者輸入值） */
export function storedSetWeightKg(
  log: Pick<WorkoutLog, "loadType" | "weightKg">,
  set: WorkoutSetDetail,
): number {
  return set.weightKg ?? log.weightKg;
}

/** 單組有效負重（kg）；單邊訓練量用兩邊加總故 ×2 */
export function effectiveSetWeightKg(
  log: Pick<
    WorkoutLog,
    "loadType" | "weightKg" | "extraWeightKg" | "assistKg"
  >,
  set: WorkoutSetDetail,
  bodyWeightKg: number | null,
): number {
  const bw =
    bodyWeightKg != null && bodyWeightKg > 0
      ? bodyWeightKg * BODYWEIGHT_FACTOR
      : 0;

  switch (log.loadType) {
    case "bodyweight":
      return Math.max(0, bw);
    case "weighted_bw":
      return Math.max(
        0,
        bw + (set.weightKg ?? log.extraWeightKg ?? 0),
      );
    case "assisted_bw":
      return Math.max(0, bw - (log.assistKg ?? 0));
    case "unilateral":
      return (set.weightKg ?? log.weightKg) * 2;
    default:
      return set.weightKg ?? log.weightKg;
  }
}

export function calcSetVolume(
  log: Pick<
    WorkoutLog,
    "loadType" | "weightKg" | "extraWeightKg" | "assistKg"
  >,
  set: WorkoutSetDetail,
  bodyWeightKg: number | null,
): number {
  const w = effectiveSetWeightKg(log, set, bodyWeightKg);
  return w * set.reps;
}

export function normalizeSetDetails(log: Omit<WorkoutLog, "id">): WorkoutSetDetail[] {
  if (log.setDetails?.length) return log.setDetails;
  return Array.from({ length: log.sets }, () => ({
    reps: log.reps,
    weightKg:
      log.loadType === "bilateral" || log.loadType === "unilateral"
        ? log.weightKg
        : log.loadType === "weighted_bw"
          ? log.extraWeightKg
          : undefined,
    gear: [],
  }));
}

export function calcLogVolume(log: WorkoutLog, bodyWeightKg: number | null): number {
  const sets = normalizeSetDetails(log);
  return sets.reduce(
    (sum, s) => sum + calcSetVolume(log, s, bodyWeightKg),
    0,
  );
}

/** 將逐組明細壓成可讀字串，連續相同組會合併（例：60×10×3 + 50×10） */
export function formatSettlementSetLines(
  setLines: SettlementSetLine[],
  options?: { unilateral?: boolean },
): string {
  if (!setLines.length) return "";

  const groups: { weightKg: number; reps: number; count: number }[] = [];
  for (const line of setLines) {
    const last = groups[groups.length - 1];
    if (last && last.weightKg === line.weightKg && last.reps === line.reps) {
      last.count += 1;
    } else {
      groups.push({ weightKg: line.weightKg, reps: line.reps, count: 1 });
    }
  }

  const prefix = options?.unilateral ? "單邊 " : "";
  return groups
    .map((g) =>
      g.count > 1
        ? `${prefix}${g.weightKg}kg×${g.reps}（${g.count}組）`
        : `${prefix}${g.weightKg}kg×${g.reps}`,
    )
    .join(" + ");
}

/** 結算畫面顯示用：單邊顯示使用者輸入的單側 kg（訓練量另以 volumeKg ×2 計算） */
export function buildSettlementSetLines(
  log: WorkoutLog,
  bodyWeightKg: number | null,
): SettlementSetLine[] {
  return normalizeSetDetails(log).map((set) => {
    const weight =
      log.loadType === "unilateral"
        ? storedSetWeightKg(log, set)
        : effectiveSetWeightKg(log, set, bodyWeightKg);
    return {
      weightKg: Math.round(weight * 10) / 10,
      reps: set.reps,
    };
  });
}

/** 結算沿用：等效 weight × reps × sets */
export function toSettlementWeight(log: WorkoutLog, bodyWeightKg: number | null): number {
  const sets = normalizeSetDetails(log);
  if (!sets.length) return log.weightKg;
  const totalVol = calcLogVolume(log, bodyWeightKg);
  const totalReps = sets.reduce((s, x) => s + x.reps, 0);
  if (totalReps <= 0) return log.weightKg;
  return Math.round((totalVol / totalReps) * 10) / 10;
}

export function formatGear(gear?: string[]): string {
  if (!gear?.length) return "";
  return gear.map((g) => GEAR_LABELS[g] ?? g).join("、");
}

export function formatWeightedBwExtra(
  log: Pick<WorkoutLog, "extraWeightKg">,
  set: WorkoutSetDetail,
): number {
  return set.weightKg ?? log.extraWeightKg ?? 0;
}

export function formatLoadLabel(
  log: Pick<
    WorkoutLog,
    "loadType" | "weightKg" | "extraWeightKg" | "assistKg"
  >,
  bodyWeightKg: number | null,
): string {
  const effective = effectiveBodyWeightKg(bodyWeightKg);
  const scale =
    bodyWeightKg != null && bodyWeightKg > 0 ? formatKg(bodyWeightKg) : null;

  switch (log.loadType) {
    case "unilateral":
      return `單邊 ${formatKg(log.weightKg)}kg`;
    case "bodyweight":
      // 同時顯示秤上體重與有效負重，體重更新時數字會跟著變
      if (scale != null && effective != null) {
        return `自重 ${scale}kg（有效${formatKg(effective)}）`;
      }
      return "自重";
    case "weighted_bw": {
      const extra = log.extraWeightKg ?? 0;
      if (scale != null && effective != null) {
        return `自重${scale}+${formatKg(extra)}kg（有效${formatKg(effective + extra)}）`;
      }
      return `+${formatKg(extra)}kg`;
    }
    case "assisted_bw": {
      const assist = log.assistKg ?? 0;
      if (scale != null && effective != null) {
        return `輔助-${formatKg(assist)}kg（體重${scale}→有效${formatKg(Math.max(0, effective - assist))}）`;
      }
      return `輔助-${formatKg(assist)}kg`;
    }
    default:
      return log.weightKg > 0 ? `${formatKg(log.weightKg)}kg` : "";
  }
}

export function formatWorkoutSummary(
  log: WorkoutLog,
  bodyWeightKg: number | null,
): string {
  const load = formatLoadLabel(log, bodyWeightKg);
  const sets = normalizeSetDetails(log);
  const gearParts = sets
    .map((s, i) => (s.gear?.length ? `第${i + 1}組 ${formatGear(s.gear)}` : ""))
    .filter(Boolean);
  const base = `${load} · ${sets.length}組`;
  if (gearParts.length) return `${base} · ${gearParts.join(" · ")}`;
  return base;
}

export const LOAD_TYPE_OPTIONS: { value: WorkoutLoadType; label: string }[] = [
  { value: "bilateral", label: "雙邊" },
  { value: "unilateral", label: "單邊" },
  { value: "bodyweight", label: "自重" },
  { value: "weighted_bw", label: "自重+負重" },
  { value: "assisted_bw", label: "輔助自重" },
];
