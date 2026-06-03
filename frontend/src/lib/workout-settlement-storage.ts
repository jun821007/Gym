import type { DailyWorkoutSettlement } from "./types";
import { toDateKey } from "./datetime";

const HISTORY_KEY = "workout-settlement-history-v2";
const LEGACY_TODAY_KEY = "daily-workout-settlement-v1";

function normalize(s: DailyWorkoutSettlement): DailyWorkoutSettlement {
  return {
    ...s,
    manualLogs: s.manualLogs ?? [],
    totalVolumeKg: s.totalVolumeKg ?? 0,
  };
}

function migrateLegacy(): DailyWorkoutSettlement[] {
  try {
    const raw = localStorage.getItem(LEGACY_TODAY_KEY);
    if (!raw) return [];
    const one = normalize(JSON.parse(raw) as DailyWorkoutSettlement);
    localStorage.removeItem(LEGACY_TODAY_KEY);
    return [one];
  } catch {
    return [];
  }
}

/** 讀取全部歷史評分（新→舊） */
export function loadSettlementHistory(): DailyWorkoutSettlement[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    let list: DailyWorkoutSettlement[] = raw
      ? (JSON.parse(raw) as DailyWorkoutSettlement[]).map(normalize)
      : migrateLegacy();

    if (list.length === 0) {
      list = seedDemoHistory();
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    }

    return list.sort((a, b) => b.logDate.localeCompare(a.logDate));
  } catch {
    return [];
  }
}

export function getSettlementByDate(
  logDate: string,
): DailyWorkoutSettlement | null {
  return loadSettlementHistory().find((s) => s.logDate === logDate) ?? null;
}

export function loadTodaySettlement(): DailyWorkoutSettlement | null {
  return getSettlementByDate(toDateKey());
}

/** 寫入／更新該日評分 */
export function saveSettlementHistory(entry: DailyWorkoutSettlement) {
  const normalized = normalize({ ...entry, logDate: entry.logDate || toDateKey() });
  const list = loadSettlementHistory().filter(
    (s) => s.logDate !== normalized.logDate,
  );
  list.push(normalized);
  list.sort((a, b) => b.logDate.localeCompare(a.logDate));
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  return list;
}

/** @deprecated 使用 saveSettlementHistory */
export function saveTodaySettlement(s: DailyWorkoutSettlement) {
  saveSettlementHistory(s);
}

function seedDemoHistory(): DailyWorkoutSettlement[] {
  const d = (offset: number) => {
    const x = new Date();
    x.setDate(x.getDate() - offset);
    return x.toISOString().slice(0, 10);
  };
  return [
    {
      grade: "A",
      workoutName: "功能性肌力訓練",
      durationMinutes: 72,
      activeCalories: 253,
      totalCalories: 332,
      avgHeartRate: 107,
      summary: "依體重 71.5kg，訓練量與有氧表現良好。",
      logDate: d(1),
      loggedAt: `${d(1)}T23:00:00`,
      manualLogs: [
        { exerciseName: "硬舉", weightKg: 100, reps: 5, sets: 3 },
        { exerciseName: "肩推", weightKg: 40, reps: 10, sets: 3 },
      ],
      totalVolumeKg: 2700,
      bodyWeightKg: 71.5,
      volumePerBodyWeight: 37.8,
    },
    {
      grade: "B",
      workoutName: "跑步",
      durationMinutes: 35,
      activeCalories: 280,
      totalCalories: 310,
      avgHeartRate: 142,
      summary: "有氧為主，重訓清單較少。",
      logDate: d(3),
      loggedAt: `${d(3)}T07:00:00`,
      manualLogs: [
        { exerciseName: "深蹲", weightKg: 77.5, reps: 8, sets: 4 },
      ],
      totalVolumeKg: 2480,
      bodyWeightKg: 72.1,
      volumePerBodyWeight: 34.4,
    },
  ];
}
