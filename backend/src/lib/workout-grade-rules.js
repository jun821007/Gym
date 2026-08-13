/**
 * 規則化訓練評級（AI 僅供評語，等級由此決定）
 * SS / SSS / SSS+ 門檻刻意很高，只有少數日子會出現。
 */
export function computeWorkoutGrade({
  durationMinutes = 0,
  activeCalories = 0,
  bodyWeightKg,
  volumePerBodyWeight = 0,
  totalVolumeKg = 0,
}) {
  const w = bodyWeightKg > 0 ? bodyWeightKg : 70;
  const kcalPerKg = activeCalories > 0 ? activeCalories / w : 0;
  const volPerKg =
    volumePerBodyWeight > 0
      ? volumePerBodyWeight
      : totalVolumeKg > 0
        ? totalVolumeKg / w
        : 0;

  const hasCardio = activeCalories > 0 && durationMinutes > 0;
  const hasVolume = volPerKg > 0;

  if (!hasCardio && !hasVolume) return "C";

  let score = 0;

  if (kcalPerKg >= 4.5) score += 2;
  else if (kcalPerKg >= 3.2) score += 1.25;
  else if (kcalPerKg >= 2.5) score += 0.5;
  else if (hasCardio) score -= 0.5;

  if (volPerKg >= 1.2) score += 2;
  else if (volPerKg >= 0.9) score += 1.25;
  else if (volPerKg >= 0.6) score += 0.5;
  else if (hasVolume) score -= 0.25;

  if (durationMinutes >= 75) score += 1;
  else if (durationMinutes >= 50) score += 0.75;
  else if (durationMinutes >= 35) score += 0.25;
  else if (hasCardio && durationMinutes < 25) score -= 0.5;

  if (
    score >= 5 &&
    kcalPerKg >= 5.8 &&
    volPerKg >= 1.7 &&
    durationMinutes >= 95
  ) {
    return "SSS+";
  }
  if (
    score >= 4.9 &&
    kcalPerKg >= 5.2 &&
    volPerKg >= 1.5 &&
    durationMinutes >= 85
  ) {
    return "SSS";
  }
  if (
    score >= 4.75 &&
    kcalPerKg >= 4.8 &&
    volPerKg >= 1.35 &&
    durationMinutes >= 75
  ) {
    return "SS";
  }
  if (
    score >= 4.5 &&
    kcalPerKg >= 4.0 &&
    volPerKg >= 0.95 &&
    durationMinutes >= 45
  ) {
    return "S";
  }
  if (score >= 3.5) return "A";
  if (score >= 2.25) return "B";
  if (score >= 1) return "C";
  return "D";
}

export function xpForWorkoutGrade(grade) {
  if (grade === "SSS+") return 90;
  if (grade === "SSS") return 75;
  if (grade === "SS") return 60;
  if (grade === "S") return 50;
  if (grade === "A") return 40;
  if (grade === "B") return 30;
  return 20;
}

export function normalizeWorkoutGrade(g) {
  const u = String(g || "C").toUpperCase();
  if (u === "SSS+") return "SSS+";
  if (["SSS+", "SSS", "SS", "S", "A", "B", "C", "D"].includes(u)) return u;
  return "C";
}
