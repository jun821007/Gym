/** @param {number} current @param {number} goal @param {"cut"|"bulk"|"maintain"} phase */
function calorieScore(current, goal, phase) {
  if (goal <= 0) return 50;
  const r = current / goal;
  if (phase === "bulk") {
    if (r >= 0.95 && r <= 1.12) return 100;
    if (r >= 0.88 && r <= 1.2) return 88;
    if (r >= 0.75 && r <= 1.3) return 72;
    if (r < 0.75) return 40;
    if (r > 1.3) return 55;
    return 35;
  }
  if (phase === "cut") {
    if (r >= 0.82 && r <= 1.02) return 100;
    if (r >= 0.72 && r <= 1.1) return 85;
    if (r >= 0.6 && r <= 1.2) return 68;
    if (r > 1.2) return 45;
    if (r > 0) return 38;
    return 15;
  }
  if (r >= 0.88 && r <= 1.08) return 100;
  if (r >= 0.78 && r <= 1.18) return 85;
  if (r >= 0.65 && r <= 1.3) return 70;
  if (r >= 0.5 && r <= 1.45) return 55;
  if (r > 0) return 35;
  return 15;
}

function proteinScore(current, goal, phase) {
  if (goal <= 0) return 50;
  const r = current / goal;
  if (phase === "bulk") {
    if (r >= 0.98 && r <= 1.4) return 100;
    if (r >= 0.88 && r <= 1.55) return 90;
    if (r >= 0.75 && r < 0.88) return 50;
    if (r >= 0.75) return 78;
    return 30;
  }
  if (phase === "cut") {
    if (r >= 0.95 && r <= 1.25) return 100;
    if (r >= 0.85 && r <= 1.4) return 88;
    if (r >= 0.7 && r < 0.85) return 48;
    if (r > 1.4) return 70;
    return 25;
  }
  if (r >= 0.95 && r <= 1.35) return 100;
  if (r >= 0.85 && r <= 1.55) return 90;
  if (r >= 0.7 && r <= 1.75) return 75;
  if (r >= 0.5 && r < 0.7) return 45;
  if (r > 1.75) return 65;
  return 35;
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

function fatScore(current, goal, phase) {
  const base = macroScore(current, goal);
  if (phase === "cut" && goal > 0 && current / goal > 1.2) {
    return Math.min(base, 55);
  }
  return base;
}

function sodiumScore(current, limitMg) {
  if (limitMg <= 0) return 50;
  const r = current / limitMg;
  if (r <= 0.85) return 100;
  if (r <= 1.0) return 92;
  if (r <= 1.15) return 75;
  if (r <= 1.3) return 55;
  if (r <= 1.5) return 40;
  return 25;
}

function fiberScore(current, goalG) {
  if (goalG <= 0) return 50;
  const r = current / goalG;
  if (r >= 1.0) return 100;
  if (r >= 0.85) return 90;
  if (r >= 0.7) return 75;
  if (r >= 0.55) return 58;
  if (r >= 0.4) return 42;
  if (r > 0) return 28;
  return 10;
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

function overallWeights(phase) {
  if (phase === "bulk") {
    return {
      cal: 0.19,
      pro: 0.27,
      carb: 0.1,
      fat: 0.08,
      sodium: 0.06,
      fiber: 0.08,
      water: 0.22,
    };
  }
  if (phase === "cut") {
    return {
      cal: 0.18,
      pro: 0.27,
      carb: 0.09,
      fat: 0.12,
      sodium: 0.09,
      fiber: 0.09,
      water: 0.16,
    };
  }
  return {
    cal: 0.18,
    pro: 0.24,
    carb: 0.1,
    fat: 0.11,
    sodium: 0.07,
    fiber: 0.07,
    water: 0.23,
  };
}

const PHASE_LABEL = { cut: "減脂", bulk: "增肌", maintain: "維持" };

function overallToGrade(overall) {
  if (overall >= 92) return "S";
  if (overall >= 82) return "A";
  if (overall >= 72) return "B";
  if (overall >= 58) return "C";
  return "D";
}

function buildSummary(
  grade,
  phase,
  totals,
  calorieGoal,
  proteinGoal,
  carbsGoal,
  fatGoal,
  sodiumGoalMg,
  fiberGoalG,
  waterMl,
  waterGoalMl,
  mealCount,
  scores,
) {
  const calPct = calorieGoal
    ? Math.round((totals.calories / calorieGoal) * 100)
    : 0;
  const proteinPct = proteinGoal
    ? Math.round((totals.proteinG / proteinGoal) * 100)
    : 0;
  const carbsPct = carbsGoal
    ? Math.round((totals.carbsG / carbsGoal) * 100)
    : 0;
  const fatPct = fatGoal ? Math.round((totals.fatG / fatGoal) * 100) : 0;
  const sodiumPct = sodiumGoalMg
    ? Math.round((totals.sodiumMg / sodiumGoalMg) * 100)
    : 0;
  const fiberPct = fiberGoalG
    ? Math.round((totals.fiberG / fiberGoalG) * 100)
    : 0;
  const waterPct = waterGoalMl
    ? Math.round((waterMl / waterGoalMl) * 100)
    : 0;
  const calRatio = calorieGoal > 0 ? totals.calories / calorieGoal : 1;
  const proteinRatio = proteinGoal > 0 ? totals.proteinG / proteinGoal : 1;
  const carbsRatio = carbsGoal > 0 ? totals.carbsG / carbsGoal : 1;
  const fatRatio = fatGoal > 0 ? totals.fatG / fatGoal : 1;
  const sodiumRatio = sodiumGoalMg > 0 ? totals.sodiumMg / sodiumGoalMg : 0;
  const fiberRatio = fiberGoalG > 0 ? totals.fiberG / fiberGoalG : 1;
  const parts = [
    `依${PHASE_LABEL[phase]}目標評分`,
    `今日 ${mealCount} 餐 · 熱量 ${totals.calories}kcal（${calPct}%）`,
    `蛋白 ${Math.round(totals.proteinG)}g（${proteinPct}%）· 碳水 ${Math.round(totals.carbsG)}g（${carbsPct}%）· 脂肪 ${Math.round(totals.fatG)}g（${fatPct}%）`,
    `鈉 ${Math.round(totals.sodiumMg)}mg（${sodiumPct}% 上限）· 膳食纖維 ${Math.round(totals.fiberG)}g（${fiberPct}%）· 飲水 ${waterMl}/${waterGoalMl}ml（${waterPct}%）`,
  ];
  if (scores.water < 70) parts.push("飲水未達標");
  if (fiberRatio < 0.7) parts.push("膳食纖維偏低");
  else if (fiberRatio >= 1.0) parts.push("纖維攝取充足");
  if (sodiumRatio > 1.15) parts.push("鈉攝取偏高");
  else if (sodiumRatio > 1.0) parts.push("鈉略超標");
  if (phase === "bulk") {
    if (proteinRatio < 0.85) parts.push("增肌期蛋白質未達標");
    else if (calRatio < 0.88) parts.push("熱量略低，不利增肌");
    else if (calRatio > 1.25) parts.push("熱量偏多，注意脂肪累積");
  } else if (phase === "cut") {
    if (proteinRatio < 0.85) parts.push("減脂期蛋白質偏低，恐掉肌肉");
    if (fatRatio > 1.25) parts.push("脂肪偏高");
    if (calRatio > 1.1) parts.push("熱量超標，減脂受阻");
    else if (calRatio >= 0.82 && calRatio <= 1.02) parts.push("熱量控制良好");
  } else {
    if (proteinRatio < 0.7) parts.push("蛋白質偏低");
    else if (proteinRatio > 1.6) parts.push("蛋白質偏多");
    if (carbsRatio < 0.6) parts.push("碳水偏低");
    else if (carbsRatio > 1.4) parts.push("碳水偏多");
    if (fatRatio < 0.6) parts.push("脂肪偏低");
    else if (fatRatio > 1.4) parts.push("脂肪偏多");
    if (calRatio < 0.65) parts.push("熱量不足");
    else if (calRatio > 1.3) parts.push("熱量偏多");
  }
  const tail =
    grade === "S"
      ? `${PHASE_LABEL[phase]}節奏極佳。`
      : grade === "A"
        ? "整體符合目標，維持即可。"
        : grade === "B"
          ? "尚可，依目標微調宏量與水量。"
          : grade === "C"
            ? "明日加強紀錄與達標。"
            : "請重新檢視餐點與飲水習慣。";
  return `${parts.join(" · ")}。${tail}`;
}

/**
 * @param {{
 *   goals: { calories: number; proteinG: number; carbsG: number; fatG: number; sodiumMg?: number; fiberG?: number; waterMl: number };
 *   totals: { calories: number; proteinG: number; carbsG: number; fatG: number; sodiumMg?: number; fiberG?: number };
 *   meals: Array<{ foodName: string; calories: number; proteinG: number; carbsG: number; fatG: number; sodiumMg?: number; fiberG?: number; loggedAt: string }>;
 *   waterMl: number;
 *   dietPhase?: "cut"|"bulk"|"maintain";
 * }} input
 */
export function computeDietSettlement(input) {
  const { goals, totals, meals, waterMl } = input;
  const phase = input.dietPhase ?? "maintain";
  const waterGoalMl = goals.waterMl || 2000;
  const sodiumGoalMg = goals.sodiumMg || 2300;
  const fiberGoalG = goals.fiberG || 25;
  const sodiumTotal = totals.sodiumMg ?? 0;
  const fiberTotal = totals.fiberG ?? 0;
  const weights = overallWeights(phase);

  const scores = {
    calories: calorieScore(totals.calories, goals.calories, phase),
    protein: proteinScore(totals.proteinG, goals.proteinG, phase),
    carbs: macroScore(totals.carbsG, goals.carbsG),
    fat: fatScore(totals.fatG, goals.fatG, phase),
    sodium: sodiumScore(sodiumTotal, sodiumGoalMg),
    fiber: fiberScore(fiberTotal, fiberGoalG),
    water: waterScore(waterMl, waterGoalMl),
    overall: 0,
  };

  scores.overall = Math.round(
    scores.calories * weights.cal +
      scores.protein * weights.pro +
      scores.carbs * weights.carb +
      scores.fat * weights.fat +
      scores.sodium * weights.sodium +
      scores.fiber * weights.fiber +
      scores.water * weights.water,
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

  const normalizedTotals = {
    ...totals,
    sodiumMg: sodiumTotal,
    fiberG: fiberTotal,
  };

  return {
    grade,
    dietPhase: phase,
    dietPhaseLabel: PHASE_LABEL[phase],
    summary: buildSummary(
      grade,
      phase,
      normalizedTotals,
      goals.calories,
      goals.proteinG,
      goals.carbsG,
      goals.fatG,
      sodiumGoalMg,
      fiberGoalG,
      waterMl,
      waterGoalMl,
      meals.length,
      scores,
    ),
    logDate,
    loggedAt: now.toISOString(),
    mealCount: meals.length,
    meals,
    totals: normalizedTotals,
    goals: {
      ...goals,
      sodiumMg: sodiumGoalMg,
      fiberG: fiberGoalG,
      waterMl: waterGoalMl,
    },
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
