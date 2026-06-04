import type { DietLog } from "@/lib/types";

/** 從使用者輸入辨識餐別（方案 A） */
export function parseMealTypeFromText(
  text: string,
): DietLog["mealType"] | undefined {
  const t = text.trim();
  if (/早餐|早飯|早饭/.test(t)) return "breakfast";
  if (/午餐|午饭|中饭|中餐/.test(t)) return "lunch";
  if (/晚餐|晚饭|晚飯/.test(t)) return "dinner";
  if (/宵夜|夜宵|夜消|點心|点心/.test(t)) return "snack";
  return undefined;
}

export function mealTypeFromHour(date = new Date()): DietLog["mealType"] {
  const hour = date.getHours();
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

/** 文字有寫餐別則優先，否則依目前時間 */
export function resolveMealType(
  userMessage: string,
  date = new Date(),
): DietLog["mealType"] {
  return parseMealTypeFromText(userMessage) ?? mealTypeFromHour(date);
}
