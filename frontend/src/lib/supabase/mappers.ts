import { DEFAULT_BODY_GOALS } from "@/lib/body-goals";
import type {
  BodyGoals,
  DailyDietSettlement,
  DailyWorkoutSettlement,
  DietLog,
  FavoriteMeal,
  InbodyRecord,
  UserProfile,
  WeeklyGrade,
  WorkoutLog,
} from "@/lib/types";
import type { WaterLogEntry } from "@/lib/water-intake";

export type ProfileRow = {
  id: string;
  display_name: string | null;
  level: number;
  xp: number;
  xp_to_next: number;
  str: number;
  vit: number;
  agi: number;
  san: number;
  inbody_history: InbodyRecord[] | null;
  daily_calorie_goal: number | null;
  daily_protein_goal: number | null;
  daily_carbs_goal: number | null;
  daily_fat_goal: number | null;
  daily_water_goal_ml: number | null;
  target_weight_kg: number | null;
  target_body_fat_pct: number | null;
  target_muscle_kg: number | null;
  nutrition_goals_inbody_date: string | null;
};

export function rowToProfile(row: ProfileRow): UserProfile {
  const history = Array.isArray(row.inbody_history) ? row.inbody_history : [];
  return {
    id: row.id,
    displayName: row.display_name ?? "冒險者",
    level: row.level,
    xp: row.xp,
    xpToNext: row.xp_to_next,
    str: row.str,
    vit: row.vit,
    agi: row.agi,
    san: row.san,
    inbodyHistory: history,
    dailyCalorieGoal: row.daily_calorie_goal ?? 2200,
    dailyProteinGoal: row.daily_protein_goal ?? 150,
    dailyCarbsGoal: row.daily_carbs_goal ?? 250,
    dailyFatGoal: row.daily_fat_goal ?? 70,
    dailyWaterGoalMl: row.daily_water_goal_ml ?? 2000,
    nutritionGoalsInbodyDate: row.nutrition_goals_inbody_date ?? undefined,
  };
}

export function rowToBodyGoals(row: ProfileRow): BodyGoals {
  return {
    targetWeightKg: row.target_weight_kg ?? DEFAULT_BODY_GOALS.targetWeightKg,
    targetBodyFatPct:
      row.target_body_fat_pct ?? DEFAULT_BODY_GOALS.targetBodyFatPct,
    targetMuscleKg: row.target_muscle_kg ?? DEFAULT_BODY_GOALS.targetMuscleKg,
  };
}

export function rowToWorkout(row: {
  id: string;
  exercise_name: string;
  weight_kg: number | null;
  reps: number;
  sets: number;
  log_date: string;
  created_at: string;
}): WorkoutLog {
  return {
    id: row.id,
    exerciseName: row.exercise_name,
    weightKg: Number(row.weight_kg) || 0,
    reps: row.reps,
    sets: row.sets,
    logDate: row.log_date,
    loggedAt: row.created_at,
  };
}

export function rowToDiet(row: {
  id: string;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
  logged_at?: string | null;
  meal_type: string | null;
}): DietLog {
  return {
    id: row.id,
    foodName: row.food_name,
    calories: row.calories,
    proteinG: Number(row.protein_g),
    carbsG: Number(row.carbs_g),
    fatG: Number(row.fat_g),
    loggedAt: row.logged_at ?? row.created_at,
    mealType: (row.meal_type as DietLog["mealType"]) ?? undefined,
  };
}

export function rowToFavoriteMeal(row: {
  id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  default_meal_type: string | null;
}): FavoriteMeal {
  return {
    id: row.id,
    name: row.name,
    calories: row.calories,
    proteinG: Number(row.protein_g),
    carbsG: Number(row.carbs_g),
    fatG: Number(row.fat_g),
    defaultMealType:
      (row.default_meal_type as FavoriteMeal["defaultMealType"]) ?? undefined,
  };
}

export function rowToWater(row: {
  id: string;
  amount_ml: number;
  log_date: string;
  created_at: string;
  logged_at?: string | null;
}): WaterLogEntry {
  return {
    id: row.id,
    amountMl: row.amount_ml,
    logDate: row.log_date,
    loggedAt: row.logged_at ?? row.created_at,
  };
}

export function rowToWorkoutSettlement(row: {
  log_date: string;
  grade: string;
  payload: DailyWorkoutSettlement;
  logged_at: string;
}): DailyWorkoutSettlement {
  return {
    ...row.payload,
    grade: row.grade as DailyWorkoutSettlement["grade"],
    logDate: row.log_date,
    loggedAt: row.logged_at,
  };
}

export function rowToDietSettlement(row: {
  log_date: string;
  grade: string;
  payload: DailyDietSettlement;
  logged_at: string;
}): DailyDietSettlement {
  return {
    ...row.payload,
    grade: row.grade as DailyDietSettlement["grade"],
    logDate: row.log_date,
    loggedAt: row.logged_at,
  };
}

export function rowToWeeklyGrade(row: {
  year: number;
  week_number: number;
  grade: string;
  ai_summary: string;
}): WeeklyGrade {
  return {
    weekLabel: `W${row.week_number}`,
    grade: row.grade as WeeklyGrade["grade"],
    summary: row.ai_summary,
    year: row.year,
    weekNumber: row.week_number,
  };
}
