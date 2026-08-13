import type { FavoriteWorkout, WorkoutCategory } from "@/lib/types";

export const BUILTIN_WORKOUT_CATEGORIES = [
  "back",
  "legs",
  "chest",
  "shoulders",
  "core",
  "forearms",
] as const;

export const WORKOUT_CATEGORY_ORDER: WorkoutCategory[] = [
  ...BUILTIN_WORKOUT_CATEGORIES,
];

export const WORKOUT_CATEGORY_LABELS: Record<string, string> = {
  back: "背",
  legs: "腿",
  chest: "胸",
  shoulders: "肩",
  core: "核心",
  forearms: "小臂",
};

const CATEGORY_ALIASES: Record<string, string> = {
  back: "back",
  legs: "legs",
  chest: "chest",
  shoulders: "shoulders",
  core: "core",
  forearms: "forearms",
  背: "back",
  腿: "legs",
  胸: "chest",
  肩: "shoulders",
  核心: "core",
  小臂: "forearms",
};

export function workoutCategoryLabel(cat: string | null | undefined): string {
  if (!cat) return "未分類";
  return WORKOUT_CATEGORY_LABELS[cat] ?? cat;
}

export const WORKOUT_CATEGORY_OPTIONS = WORKOUT_CATEGORY_ORDER.map((value) => ({
  value,
  label: workoutCategoryLabel(value),
}));

export function normalizeWorkoutCategory(
  value: string | null | undefined,
): WorkoutCategory | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  return CATEGORY_ALIASES[v] ?? v;
}

export function isBuiltinWorkoutCategory(value: string | null | undefined): boolean {
  return (
    value === "back" ||
    value === "legs" ||
    value === "chest" ||
    value === "shoulders" ||
    value === "core" ||
    value === "forearms"
  );
}

export function isWorkoutCategory(
  value: string | null | undefined,
): value is WorkoutCategory {
  return normalizeWorkoutCategory(value) != null;
}

export function collectWorkoutCategories(
  favorites: FavoriteWorkout[],
): WorkoutCategory[] {
  const extra: string[] = [];
  const seen = new Set<string>();
  let hasUncategorized = false;
  for (const fav of favorites) {
    const cat = fav.category?.trim();
    if (!cat) {
      hasUncategorized = true;
      continue;
    }
    if (isBuiltinWorkoutCategory(cat) || seen.has(cat)) continue;
    seen.add(cat);
    extra.push(cat);
  }
  extra.sort((a, b) => a.localeCompare(b, "zh-TW"));
  return [
    ...WORKOUT_CATEGORY_ORDER,
    ...extra,
    ...(hasUncategorized ? [""] : []),
  ];
}
