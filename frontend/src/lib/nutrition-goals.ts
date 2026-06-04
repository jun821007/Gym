import type { BodyGoals, InbodyRecord } from "@/lib/types";

export interface NutritionGoals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** 給 UI 顯示的簡短說明 */
  rationale: string;
}

export type DietPhase = "cut" | "bulk" | "maintain";

/** 每週重訓 3–5 次 */
const ACTIVITY_FACTOR = 1.55;

function round10(n: number) {
  return Math.round(n / 10) * 10;
}

function round5(n: number) {
  return Math.round(n / 5) * 5;
}

/** 去脂體重：優先 InBody 體脂率，骨骼肌作輔助 */
export function estimateLeanMassKg(
  weightKg: number,
  bodyFatPct?: number,
  skeletalMuscleKg?: number,
): number {
  if (bodyFatPct != null && bodyFatPct >= 3 && bodyFatPct <= 60) {
    const fromFat = weightKg * (1 - bodyFatPct / 100);
    if (skeletalMuscleKg != null && skeletalMuscleKg > 0) {
      return Math.max(fromFat * 0.92, skeletalMuscleKg * 1.05);
    }
    return fromFat;
  }
  if (skeletalMuscleKg != null && skeletalMuscleKg > 0) {
    return skeletalMuscleKg * 1.15;
  }
  return weightKg * 0.85;
}

/** Katch–McArdle：依去脂體重估算 BMR */
export function estimateBmr(leanKg: number): number {
  return 370 + 21.6 * leanKg;
}

/** 依體態目標與最新 InBody 推斷減脂／增肌／維持 */
export function inferDietPhase(
  latest: InbodyRecord,
  goals: BodyGoals,
): DietPhase {
  const w = latest.weight_kg;
  const fat = latest.body_fat_pct;
  const muscle = latest.skeletal_muscle_kg;
  let score = 0;

  if (w > goals.targetWeightKg + 0.3) score -= 1;
  if (w < goals.targetWeightKg - 0.3) score += 1;
  if (fat != null && fat > goals.targetBodyFatPct + 1.5) score -= 2;
  if (fat != null && fat < goals.targetBodyFatPct - 1) score += 1;
  if (muscle != null && muscle < goals.targetMuscleKg - 0.5) score += 2;
  if (muscle != null && muscle >= goals.targetMuscleKg) score -= 1;

  if (score <= -2) return "cut";
  if (score >= 2) return "bulk";
  if (score < 0) return "cut";
  if (score > 0) return "bulk";
  return "maintain";
}

/**
 * 依最新 InBody + 體態目標計算每日營養建議（非 AI，可重現公式）
 */
export function computeNutritionGoalsFromInbody(
  latest: InbodyRecord,
  goals: BodyGoals,
): NutritionGoals {
  const weight = latest.weight_kg;
  const lean = estimateLeanMassKg(
    weight,
    latest.body_fat_pct,
    latest.skeletal_muscle_kg,
  );
  const bmr = estimateBmr(lean);
  const tdee = bmr * ACTIVITY_FACTOR;
  const phase = inferDietPhase(latest, goals);

  let calories = tdee;
  if (phase === "cut") calories = tdee - 400;
  else if (phase === "bulk") calories = tdee + 250;

  calories = Math.max(1400, Math.min(3800, round10(calories)));

  let proteinG: number;
  if (phase === "cut") proteinG = 2.0 * lean;
  else if (phase === "bulk") proteinG = 2.0 * weight;
  else proteinG = 1.8 * lean;

  proteinG = round5(Math.max(70, Math.min(220, proteinG)));

  const fatKcal = calories * 0.28;
  let fatG = round5(fatKcal / 9);
  fatG = Math.max(45, Math.min(120, fatG));

  const carbKcal = calories - proteinG * 4 - fatG * 9;
  let carbsG = round5(Math.max(80, carbKcal / 4));

  const phaseLabel =
    phase === "cut" ? "減脂" : phase === "bulk" ? "增肌" : "維持";

  const fatStr =
    latest.body_fat_pct != null
      ? `${latest.body_fat_pct}% 體脂`
      : "體脂未量";
  const muscleStr =
    latest.skeletal_muscle_kg != null
      ? `、骨骼肌 ${latest.skeletal_muscle_kg}kg`
      : "";

  return {
    calories,
    proteinG,
    carbsG,
    fatG,
    rationale: `依 InBody ${weight}kg／${fatStr}${muscleStr}，體態目標傾向${phaseLabel}（BMR≈${Math.round(bmr)}→活動量≈${Math.round(tdee)} kcal）`,
  };
}

export function getLatestInbodyRecord(
  history: InbodyRecord[],
): InbodyRecord | null {
  if (!history.length) return null;
  return [...history].sort((a, b) =>
    a.recorded_at.localeCompare(b.recorded_at),
  ).at(-1)!;
}

/** 畫面用：有 InBody 就以公式為準（與 DB 脫鉤，避免 migration 未跑時仍顯示 2200） */
export function resolveNutritionGoalsForDisplay(
  profile: { inbodyHistory: InbodyRecord[]; dailyCalorieGoal: number; dailyProteinGoal: number; dailyCarbsGoal: number; dailyFatGoal: number },
  goals: BodyGoals,
): NutritionGoals & { fromInbody: boolean } {
  const latest = getLatestInbodyRecord(profile.inbodyHistory);
  if (!latest) {
    return {
      calories: profile.dailyCalorieGoal,
      proteinG: profile.dailyProteinGoal,
      carbsG: profile.dailyCarbsGoal,
      fatG: profile.dailyFatGoal,
      rationale: "",
      fromInbody: false,
    };
  }
  const computed = computeNutritionGoalsFromInbody(latest, goals);
  return { ...computed, fromInbody: true };
}

export function isNutritionGoalsOutOfSync(
  profile: {
    inbodyHistory: InbodyRecord[];
    dailyCalorieGoal: number;
    dailyProteinGoal: number;
    nutritionGoalsInbodyDate?: string;
  },
  goals: BodyGoals,
): boolean {
  const latest = getLatestInbodyRecord(profile.inbodyHistory);
  if (!latest) return false;
  const computed = computeNutritionGoalsFromInbody(latest, goals);
  const latestDate = latest.recorded_at.slice(0, 10);
  return (
    profile.dailyCalorieGoal !== computed.calories ||
    profile.dailyProteinGoal !== computed.proteinG ||
    profile.nutritionGoalsInbodyDate !== latestDate
  );
}
