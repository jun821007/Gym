import type { UserProfile, WorkoutLoadType, WorkoutLog, WorkoutSetDetail } from "@/lib/types";

export const BODYWEIGHT_FACTOR = 0.95;

export const GEAR_LABELS: Record<string, string> = {
  strap: "拉力帶",
  belt: "護腰",
  knee: "護膝",
};

export function getLatestBodyWeightKg(profile: UserProfile): number | null {
  const w = profile.inbodyHistory.at(-1)?.weight_kg;
  return w != null && w > 0 ? w : null;
}

/** 單組有效負重（kg） */
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
      return Math.max(0, bw + (log.extraWeightKg ?? 0));
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
    weightKg: log.loadType === "bilateral" || log.loadType === "unilateral"
      ? log.weightKg
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

export function formatLoadLabel(
  log: Pick<
    WorkoutLog,
    "loadType" | "weightKg" | "extraWeightKg" | "assistKg"
  >,
  bodyWeightKg: number | null,
): string {
  const bw =
    bodyWeightKg != null ? Math.round(bodyWeightKg * BODYWEIGHT_FACTOR * 10) / 10 : null;

  switch (log.loadType) {
    case "unilateral":
      return `單邊 ${log.weightKg}kg`;
    case "bodyweight":
      return bw != null ? `自重(${bw}kg)` : "自重";
    case "weighted_bw":
      return bw != null
        ? `自重+${log.extraWeightKg ?? 0}kg`
        : `+${log.extraWeightKg ?? 0}kg`;
    case "assisted_bw":
      return bw != null
        ? `輔助-${log.assistKg ?? 0}kg`
        : `輔助-${log.assistKg ?? 0}kg`;
    default:
      return log.weightKg > 0 ? `${log.weightKg}kg` : "";
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
