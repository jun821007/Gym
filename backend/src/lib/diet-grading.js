/** @param {number} current @param {number} goal */
function calorieScore(current, goal) {
  if (goal <= 0) return 50;
  const r = current / goal;
  if (r >= 0.88 && r <= 1.08) return 100;
  if (r >= 0.78 && r <= 1.18) return 85;
  if (r >= 0.65 && r <= 1.3) return 70;
  if (r >= 0.5 && r <= 1.45) return 55;
  if (r > 0) return 35;
  return 15;
}

function proteinScore(current, goal) {
  if (goal <= 0) return 50;
  const r = current / goal;
  if (r >= 0.95 && r <= 1.25) return 100;
  if (r >= 0.85 && r <= 1.35) return 85;
  if (r >= 0.7 && r <= 1.5) return 70;
  if (r >= 0.5) return 50;
  if (r > 0) return 35;
  return 15;
}

function macroScore(current, goal) {
  if (goal <= 0) return 50;
  const r = current / goal;
  if (r >= 0.85 && r <= 1.15) return 100;
  if (r >= 0.75 && r <= 1.25) return 85;
  if (r >= 0.6 && r <= 1.4) return 70;
  if (r >= 0.4) return 50;
  if (r > 0) return 35;
  return 15;
}

function waterScore(current, goal) {
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

function overallToGrade(overall) {
  if (overall >= 92) return "S";
  if (overall >= 82) return "A";
  if (overall >= 72) return "B";
  if (overall >= 58) return "C";
  return "D";
}

function buildSummary(grade, totals, calorieGoal, waterMl, waterGoalMl, mealCount, scores) {
  const calPct = calorieGoal
    ? Math.round((totals.calories / calorieGoal) * 100)
    : 0;
  const waterPct = waterGoalMl
    ? Math.round((waterMl / waterGoalMl) * 100)
    : 0;
  const parts = [
    `今日 ${mealCount} 餐 · 熱量 ${totals.calories}kcal（${calPct}%）`,
    `蛋白 ${Math.round(totals.proteinG)}g · 水 ${waterMl}/${waterGoalMl}ml（${waterPct}%）`,
  ];
  if (scores.water < 70) parts.push("飲水未達標");
  if (scores.protein < 70) parts.push("蛋白質偏低");
  if (scores.calories < 70) parts.push("熱量偏離目標");
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

/**
 * @param {{
 *   goals: { calories: number; proteinG: number; carbsG: number; fatG: number; waterMl: number };
 *   totals: { calories: number; proteinG: number; carbsG: number; fatG: number };
 *   meals: Array<{ foodName: string; calories: number; proteinG: number; carbsG: number; fatG: number; loggedAt: string }>;
 *   waterMl: number;
 * }} input
 */
export function computeDietSettlement(input) {
  const { goals, totals, meals, waterMl } = input;
  const waterGoalMl = goals.waterMl || 2000;

  const scores = {
    calories: calorieScore(totals.calories, goals.calories),
    protein: proteinScore(totals.proteinG, goals.proteinG),
    carbs: macroScore(totals.carbsG, goals.carbsG),
    fat: macroScore(totals.fatG, goals.fatG),
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

  if (meals.length === 0) {
    scores.overall = Math.round(scores.overall * 0.45 + scores.water * 0.55);
    if (waterMl <= 0) scores.overall = Math.min(scores.overall, 25);
  }

  scores.overall = Math.min(100, Math.max(0, scores.overall));
  const grade = overallToGrade(scores.overall);
  const now = new Date();
  const logDate = now.toISOString().slice(0, 10);
  const waterPct =
    waterGoalMl > 0 ? Math.round((waterMl / waterGoalMl) * 100) : 0;

  return {
    grade,
    summary: buildSummary(
      grade,
      totals,
      goals.calories,
      waterMl,
      waterGoalMl,
      meals.length,
      scores,
    ),
    logDate,
    loggedAt: now.toISOString(),
    mealCount: meals.length,
    meals,
    totals,
    goals: { ...goals, waterMl: waterGoalMl },
    waterMl,
    waterGoalMl,
    waterPct,
    scores,
  };
}

export function xpForDietGrade(grade) {
  if (grade === "S") return 50;
  if (grade === "A") return 40;
  if (grade === "B") return 30;
  return 20;
}
