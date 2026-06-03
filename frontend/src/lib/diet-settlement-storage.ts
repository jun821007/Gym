import type { DailyDietSettlement } from "./types";
import { toDateKey } from "./datetime";

const HISTORY_KEY = "diet-settlement-history-v1";

function normalize(s: DailyDietSettlement): DailyDietSettlement {
  return {
    ...s,
    meals: s.meals ?? [],
    scores: s.scores ?? {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      water: 0,
      overall: 0,
    },
  };
}

export function loadDietSettlementHistory(): DailyDietSettlement[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    let list: DailyDietSettlement[] = raw
      ? (JSON.parse(raw) as DailyDietSettlement[]).map(normalize)
      : [];

    if (list.length === 0) {
      list = seedDemoDietHistory();
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    }

    return list.sort((a, b) => b.logDate.localeCompare(a.logDate));
  } catch {
    return [];
  }
}

export function saveDietSettlementHistory(entry: DailyDietSettlement) {
  const normalized = normalize({
    ...entry,
    logDate: entry.logDate || toDateKey(),
  });
  const list = loadDietSettlementHistory().filter(
    (s) => s.logDate !== normalized.logDate,
  );
  list.push(normalized);
  list.sort((a, b) => b.logDate.localeCompare(a.logDate));
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  return list;
}

function seedDemoDietHistory(): DailyDietSettlement[] {
  const d = (offset: number) => {
    const x = new Date();
    x.setDate(x.getDate() - offset);
    return x.toISOString().slice(0, 10);
  };

  const base = (logDate: string, grade: DailyDietSettlement["grade"], waterPct: number): DailyDietSettlement => ({
    grade,
    summary:
      grade === "A"
        ? "昨日 4 餐 · 熱量 98% · 水 2100/2000ml。整體均衡。"
        : "3 餐 · 蛋白偏低 · 水 1200/2000ml。明日加強補水。",
    logDate,
    loggedAt: `${logDate}T21:30:00`,
    mealCount: grade === "A" ? 4 : 3,
    meals: [],
    totals: {
      calories: grade === "A" ? 2150 : 1800,
      proteinG: grade === "A" ? 148 : 95,
      carbsG: 220,
      fatG: 62,
    },
    goals: {
      calories: 2200,
      proteinG: 150,
      carbsG: 250,
      fatG: 70,
      waterMl: 2000,
    },
    waterMl: grade === "A" ? 2100 : 1200,
    waterGoalMl: 2000,
    waterPct,
    scores: {
      calories: grade === "A" ? 95 : 75,
      protein: grade === "A" ? 92 : 60,
      carbs: 85,
      fat: 88,
      water: waterPct >= 100 ? 100 : 65,
      overall: grade === "A" ? 88 : 68,
    },
  });

  return [base(d(1), "A", 105), base(d(2), "B", 60)];
}
