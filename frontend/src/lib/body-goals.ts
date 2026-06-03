import type { BodyGoals, InbodyRecord } from "./types";

const STORAGE_KEY = "body-goals-v1";

export const DEFAULT_BODY_GOALS: BodyGoals = {
  targetWeightKg: 70,
  targetBodyFatPct: 15,
  targetMuscleKg: 33,
};

export type BodyQuestType = "lose_weight" | "lose_fat" | "gain_muscle";

export interface BodyQuest {
  type: BodyQuestType;
  label: string;
  icon: string;
  current: number;
  target: number;
  unit: string;
  start: number;
  direction: "down" | "up";
  progress: number;
  color: string;
  completed: boolean;
}

export function loadBodyGoals(): BodyGoals {
  if (typeof window === "undefined") return DEFAULT_BODY_GOALS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BODY_GOALS;
    return { ...DEFAULT_BODY_GOALS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BODY_GOALS;
  }
}

export function saveBodyGoals(goals: BodyGoals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

/** 任務進度 0–100 */
export function questProgress(
  current: number,
  target: number,
  start: number,
  direction: "down" | "up",
): number {
  if (direction === "down") {
    const total = start - target;
    if (total <= 0) return current <= target ? 100 : 0;
    const done = start - current;
    return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
  }
  const total = target - start;
  if (total <= 0) return current >= target ? 100 : 0;
  const done = current - start;
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
}

export function getQuestStart(
  history: InbodyRecord[],
  field: "weight_kg" | "body_fat_pct" | "skeletal_muscle_kg",
  fallback: number,
): number {
  const first = history[0];
  if (!first) return fallback;
  const v = first[field];
  return v ?? fallback;
}

const THRESHOLD = {
  weight: 0.3,
  fat: 0.3,
  muscle: 0.2,
};

/**
 * 依「目標 vs 現況」自動判斷主線：減重 / 減脂 / 增肌（只顯示有方向差的項目）
 */
export function deriveBodyQuests(
  goals: BodyGoals,
  latest: InbodyRecord | undefined,
  history: InbodyRecord[],
): BodyQuest[] {
  const weight = latest?.weight_kg;
  const fat = latest?.body_fat_pct;
  const muscle =
    latest?.skeletal_muscle_kg ??
    (weight != null && fat != null
      ? Math.round(weight * (1 - fat / 100) * 0.52 * 10) / 10
      : undefined);

  const quests: BodyQuest[] = [];

  if (weight != null && goals.targetWeightKg < weight - THRESHOLD.weight) {
    const start = getQuestStart(history, "weight_kg", weight);
    const target = goals.targetWeightKg;
    const progress = questProgress(weight, target, start, "down");
    quests.push({
      type: "lose_weight",
      label: "減重",
      icon: "⚖",
      current: weight,
      target,
      unit: "kg",
      start,
      direction: "down",
      progress,
      color: "#41a6f6",
      completed: progress >= 100,
    });
  }

  if (fat != null && goals.targetBodyFatPct < fat - THRESHOLD.fat) {
    const start = getQuestStart(history, "body_fat_pct", fat);
    const target = goals.targetBodyFatPct;
    const progress = questProgress(fat, target, start, "down");
    quests.push({
      type: "lose_fat",
      label: "減脂",
      icon: "🔥",
      current: fat,
      target,
      unit: "%",
      start,
      direction: "down",
      progress,
      color: "#38b764",
      completed: progress >= 100,
    });
  }

  if (muscle != null && goals.targetMuscleKg > muscle + THRESHOLD.muscle) {
    const start = getQuestStart(history, "skeletal_muscle_kg", muscle);
    const target = goals.targetMuscleKg;
    const progress = questProgress(muscle, target, start, "up");
    quests.push({
      type: "gain_muscle",
      label: "增肌",
      icon: "💪",
      current: muscle,
      target,
      unit: "kg",
      start,
      direction: "up",
      progress,
      color: "#6ee7a0",
      completed: progress >= 100,
    });
  }

  return quests;
}

export function questLabelsText(quests: BodyQuest[]): string {
  if (quests.length === 0) return "已達成或未設定方向";
  return quests.map((q) => q.label).join(" · ");
}
