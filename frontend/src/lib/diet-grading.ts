import { toDateKey } from "./datetime";
import type {
  DailyDietSettlement,
  DietLog,
  RankGrade,
  UserProfile,
} from "./types";

export interface DietSettleInput {
  profile: Pick<
    UserProfile,
    | "dailyCalorieGoal"
    | "dailyProteinGoal"
    | "dailyCarbsGoal"
    | "dailyFatGoal"
  >;
  todayMeals: DietLog[];
  waterMl: number;
  waterGoalMl: number;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** 熱量：接近目標最好，過多過少扣分 */
function calorieScore(current: number, goal: number): number {
  if (goal <= 0) return 50;
  const r = current / goal;
  if (r >= 0.88 && r <= 1.08) return 100;
  if (r >= 0.78 && r <= 1.18) return 85;
  if (r >= 0.65 && r <= 1.3) return 70;
  if (r >= 0.5 && r <= 1.45) return 55;
  if (r > 0) return 35;
  return 15;
}

/** 蛋白：達標或略超佳（增肌常略超，勿與「不足」混為一談） */
function proteinScore(current: number, goal: number): number {
  if (goal <= 0) return 50;
  const r = current / goal;
  if (r >= 0.95 && r <= 1.35) return 100;
  if (r >= 0.85 && r <= 1.55) return 90;
  if (r >= 0.7 && r <= 1.75) return 75;
  if (r >= 0.5 && r < 0.7) return 45;
  if (r > 1.75) return 65;
  if (r > 0) return 35;
  return 15;
}

function macroScore(current: number, goal: number): number {
  if (goal <= 0) return 50;
  const r = current / goal;
  if (r >= 0.85 && r <= 1.15) return 100;
  if (r >= 0.75 && r <= 1.25) return 85;
  if (r >= 0.6 && r <= 1.4) return 70;
  if (r >= 0.4) return 50;
  if (r > 0) return 35;
  return 15;
}

function waterScore(current: number, goal: number): number {
  if (goal <= 0) return 50;
  const r = current / goal;
  if (r >= 1) return 100;
  if (r >= 0.9) return 92;
  if (r >= 0.75) return 80;
  if (r >= 0.6) return 65;
  if (r >= 0.4) return 45;
  if (r > 0) return 30;
  return 10;
}

function overallToGrade(overall: number): RankGrade {
  if (overall >= 92) return "S";
  if (overall >= 82) return "A";
  if (overall >= 72) return "B";
  if (overall >= 58) return "C";
  return "D";
}

function buildSummary(
  grade: RankGrade,
  totals: { calories: number; proteinG: number },
  calorieGoal: number,
  proteinGoal: number,
  waterMl: number,
  waterGoalMl: number,
  mealCount: number,
  scores: DailyDietSettlement["scores"],
): string {
  const calPct = calorieGoal
    ? Math.round((totals.calories / calorieGoal) * 100)
    : 0;
  const proteinPct = proteinGoal
    ? Math.round((totals.proteinG / proteinGoal) * 100)
    : 0;
  const waterPct = waterGoalMl
    ? Math.round((waterMl / waterGoalMl) * 100)
    : 0;
  const calRatio = calorieGoal > 0 ? totals.calories / calorieGoal : 1;
  const proteinRatio = proteinGoal > 0 ? totals.proteinG / proteinGoal : 1;

  const parts: string[] = [];
  parts.push(
    `今日 ${mealCount} 餐 · 熱量 ${totals.calories}kcal（${calPct}%）`,
  );
  parts.push(
    `蛋白 ${Math.round(totals.proteinG)}g（${proteinPct}%）· 水 ${waterMl}/${waterGoalMl}ml（${waterPct}%）`,
  );

  if (scores.water < 70) parts.push("飲水未達標");
  if (proteinRatio < 0.7) parts.push("蛋白質偏低");
  else if (proteinRatio > 1.6) parts.push("蛋白質偏多");
  if (calRatio < 0.65) parts.push("熱量不足");
  else if (calRatio > 1.3) parts.push("熱量偏多");

  const tail =
    grade === "S"
      ? "營養與補水表現極佳。"
      : grade === "A"
        ? "整體均衡，維持即可。"
        : grade === "B"
          ? "尚可，微調宏量與水量。"
          : grade === "C"
            ? "明日加強紀錄與達標。"
            : "請重新檢視餐點與飲水習慣。";

  return `${parts.join(" · ")}。${tail}`;
}

export function computeDietSettlement(
  input: DietSettleInput,
): DailyDietSettlement {
  const { profile, todayMeals, waterMl, waterGoalMl } = input;

  const totals = todayMeals.reduce(
    (acc, d) => ({
      calories: acc.calories + d.calories,
      proteinG: acc.proteinG + d.proteinG,
      carbsG: acc.carbsG + d.carbsG,
      fatG: acc.fatG + d.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  const scores = {
    calories: calorieScore(totals.calories, profile.dailyCalorieGoal),
    protein: proteinScore(totals.proteinG, profile.dailyProteinGoal),
    carbs: macroScore(totals.carbsG, profile.dailyCarbsGoal),
    fat: macroScore(totals.fatG, profile.dailyFatGoal),
    water: waterScore(waterMl, waterGoalMl),
    overall: 0,
  };

  scores.overall = Math.round(
    scores.calories * 0.22 +
      scores.protein * 0.28 +
      scores.carbs * 0.12 +
      scores.fat * 0.13 +
      scores.water * 0.25,
  );

  if (todayMeals.length === 0) {
    scores.overall = Math.round(scores.overall * 0.45 + scores.water * 0.55);
    if (waterMl <= 0) scores.overall = Math.min(scores.overall, 25);
  }

  scores.overall = clamp(scores.overall, 0, 100);
  const grade = overallToGrade(scores.overall);
  const now = new Date();
  const logDate = toDateKey(now);

  const goals = {
    calories: profile.dailyCalorieGoal,
    proteinG: profile.dailyProteinGoal,
    carbsG: profile.dailyCarbsGoal,
    fatG: profile.dailyFatGoal,
    waterMl: waterGoalMl,
  };

  const meals: DailyDietSettlement["meals"] = todayMeals.map((d) => ({
    foodName: d.foodName,
    calories: d.calories,
    proteinG: d.proteinG,
    carbsG: d.carbsG,
    fatG: d.fatG,
    loggedAt: d.loggedAt,
  }));

  const waterPct =
    waterGoalMl > 0 ? Math.round((waterMl / waterGoalMl) * 100) : 0;

  return {
    grade,
    summary: buildSummary(
      grade,
      totals,
      profile.dailyCalorieGoal,
      profile.dailyProteinGoal,
      waterMl,
      waterGoalMl,
      todayMeals.length,
      scores,
    ),
    logDate,
    loggedAt: now.toISOString(),
    mealCount: todayMeals.length,
    meals,
    totals,
    goals,
    waterMl,
    waterGoalMl,
    waterPct,
    scores,
  };
}

export function xpForDietGrade(grade: RankGrade): number {
  if (grade === "S") return 50;
  if (grade === "A") return 40;
  if (grade === "B") return 30;
  return 20;
}
