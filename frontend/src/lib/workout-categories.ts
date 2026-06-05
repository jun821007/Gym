import type { WorkoutCategory } from "@/lib/types";

export const WORKOUT_CATEGORY_ORDER: WorkoutCategory[] = [
  "back",
  "legs",
  "chest",
  "shoulders",
];

export const WORKOUT_CATEGORY_LABELS: Record<WorkoutCategory, string> = {
  back: "背",
  legs: "腿",
  chest: "胸",
  shoulders: "肩",
};

export const WORKOUT_CATEGORY_OPTIONS = WORKOUT_CATEGORY_ORDER.map((value) => ({
  value,
  label: WORKOUT_CATEGORY_LABELS[value],
}));

export function normalizeWorkoutCategory(
  value: string | null | undefined,
): WorkoutCategory {
  if (
    value === "back" ||
    value === "legs" ||
    value === "chest" ||
    value === "shoulders"
  ) {
    return value;
  }
  return "chest";
}
