import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BodyGoals,
  DailyDietSettlement,
  DailyWorkoutSettlement,
  DietLog,
  FavoriteMeal,
  FavoriteWorkout,
  InbodyRecord,
  UserProfile,
  WeeklyGrade,
  WorkoutLog,
} from "@/lib/types";
import type { WaterLogEntry } from "@/lib/water-intake";
import {
  computeNutritionGoalsFromInbody,
  getLatestInbodyRecord,
  isNutritionGoalsOutOfSync,
} from "@/lib/nutrition-goals";
import {
  rowToBodyGoals,
  rowToDiet,
  rowToFavoriteMeal,
  rowToFavoriteWorkout,
  rowToDietSettlement,
  rowToProfile,
  rowToWater,
  rowToWeeklyGrade,
  rowToWorkout,
  rowToWorkoutSettlement,
  type ProfileRow,
} from "./mappers";

export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ profile: UserProfile; goals: BodyGoals } | null> {
  let { data, error } = await supabase
    .from("users_profile")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const { error: insertErr } = await supabase.from("users_profile").insert({
      id: userId,
      display_name: "冒險者",
    });
    if (insertErr) throw insertErr;
    const retry = await supabase
      .from("users_profile")
      .select("*")
      .eq("id", userId)
      .single();
    if (retry.error) throw retry.error;
    data = retry.data;
  }

  const row = data as ProfileRow;
  return { profile: rowToProfile(row), goals: rowToBodyGoals(row) };
}

export async function updateProfile(
  supabase: SupabaseClient,
  profile: UserProfile,
) {
  const { error } = await supabase
    .from("users_profile")
    .update({
      display_name: profile.displayName,
      level: profile.level,
      xp: profile.xp,
      xp_to_next: profile.xpToNext,
      str: profile.str,
      vit: profile.vit,
      agi: profile.agi,
      san: profile.san,
      inbody_history: profile.inbodyHistory,
      daily_calorie_goal: profile.dailyCalorieGoal,
      daily_protein_goal: profile.dailyProteinGoal,
      daily_carbs_goal: profile.dailyCarbsGoal,
      daily_fat_goal: profile.dailyFatGoal,
      daily_water_goal_ml: profile.dailyWaterGoalMl ?? 2000,
      daily_workout_volume_goal_kg: profile.dailyWorkoutVolumeGoalKg ?? null,
      nutrition_goals_inbody_date: profile.nutritionGoalsInbodyDate ?? null,
    })
    .eq("id", profile.id);
  if (error) throw error;
}

export async function appendInbodyRecord(
  supabase: SupabaseClient,
  userId: string,
  record: InbodyRecord,
) {
  const { error } = await supabase.rpc("append_inbody_record", {
    p_user_id: userId,
    p_record: record,
  });
  if (error) throw error;
}

/** 依最新 InBody + 體態目標更新每日熱量／蛋白等建議 */
export async function syncNutritionGoalsFromInbody(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ profile: UserProfile; goals: BodyGoals; rationale: string } | null> {
  const bundle = await fetchProfile(supabase, userId);
  if (!bundle) return null;

  const latest = getLatestInbodyRecord(bundle.profile.inbodyHistory);
  if (!latest) return null;

  const computed = computeNutritionGoalsFromInbody(latest, bundle.goals);
  const inbodyDate = latest.recorded_at.slice(0, 10);

  const nextProfile: UserProfile = {
    ...bundle.profile,
    dailyCalorieGoal: computed.calories,
    dailyProteinGoal: computed.proteinG,
    dailyCarbsGoal: computed.carbsG,
    dailyFatGoal: computed.fatG,
    nutritionGoalsInbodyDate: inbodyDate,
  };

  const coreUpdate = {
    daily_calorie_goal: computed.calories,
    daily_protein_goal: computed.proteinG,
    daily_carbs_goal: computed.carbsG,
    daily_fat_goal: computed.fatG,
  };

  const { error: coreError } = await supabase
    .from("users_profile")
    .update(coreUpdate)
    .eq("id", userId);

  if (coreError) throw coreError;

  await supabase
    .from("users_profile")
    .update({ nutrition_goals_inbody_date: inbodyDate })
    .eq("id", userId);
  /* 005 migration 未跑時略過日期欄位，核心目標已寫入 */

  return {
    profile: nextProfile,
    goals: bundle.goals,
    rationale: computed.rationale,
  };
}

/** 若已有新 InBody 尚未同步營養目標，則重算 */
export async function syncNutritionGoalsIfStale(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ profile: UserProfile; rationale: string } | null> {
  const bundle = await fetchProfile(supabase, userId);
  if (!bundle) return null;

  const latest = getLatestInbodyRecord(bundle.profile.inbodyHistory);
  if (!latest) return null;

  if (!isNutritionGoalsOutOfSync(bundle.profile, bundle.goals)) {
    return null;
  }

  const result = await syncNutritionGoalsFromInbody(supabase, userId);
  if (!result) return null;
  return { profile: result.profile, rationale: result.rationale };
}

export async function saveBodyGoals(
  supabase: SupabaseClient,
  userId: string,
  goals: BodyGoals,
) {
  const { error } = await supabase
    .from("users_profile")
    .update({
      target_weight_kg: goals.targetWeightKg,
      target_body_fat_pct: goals.targetBodyFatPct,
      target_muscle_kg: goals.targetMuscleKg,
    })
    .eq("id", userId);
  if (error) throw error;
}

export async function fetchWorkouts(
  supabase: SupabaseClient,
  userId: string,
): Promise<WorkoutLog[]> {
  const { data, error } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToWorkout);
}

function workoutInsertPayload(userId: string, log: Omit<WorkoutLog, "id">) {
  const sets = log.setDetails?.length
    ? log.setDetails
    : Array.from({ length: log.sets }, () => ({
        reps: log.reps,
        weightKg:
          log.loadType === "bilateral" || log.loadType === "unilateral"
            ? log.weightKg
            : undefined,
        gear: undefined,
      }));
  const avgReps = sets.length
    ? Math.round(sets.reduce((s, x) => s + x.reps, 0) / sets.length)
    : log.reps;

  return {
    user_id: userId,
    log_date: log.logDate,
    exercise_name: log.exerciseName,
    weight_kg: log.weightKg,
    reps: avgReps,
    sets: sets.length || log.sets,
    load_type: log.loadType,
    extra_weight_kg: log.extraWeightKg ?? 0,
    assist_kg: log.assistKg ?? 0,
    set_details: sets,
  };
}

export async function insertWorkout(
  supabase: SupabaseClient,
  userId: string,
  log: Omit<WorkoutLog, "id">,
): Promise<WorkoutLog> {
  const full = workoutInsertPayload(userId, log);
  const { load_type, extra_weight_kg, assist_kg, set_details, ...base } = full;
  const withLoggedAt = { ...full, logged_at: log.loggedAt };

  let { data, error } = await supabase
    .from("workout_logs")
    .insert(withLoggedAt)
    .select()
    .single();

  if (error?.message?.includes("logged_at")) {
    const retry = await supabase.from("workout_logs").insert(full).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (
    error?.message?.includes("load_type") ||
    error?.message?.includes("set_details")
  ) {
    const retry = await supabase
      .from("workout_logs")
      .insert(base)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  return rowToWorkout(data);
}

export async function deleteWorkout(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { error } = await supabase
    .from("workout_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function fetchFavoriteWorkouts(
  supabase: SupabaseClient,
  userId: string,
): Promise<FavoriteWorkout[]> {
  const { data, error } = await supabase
    .from("favorite_workouts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    if (error.message?.includes("favorite_workouts")) return [];
    throw error;
  }
  return (data ?? []).map(rowToFavoriteWorkout);
}

export async function insertFavoriteWorkout(
  supabase: SupabaseClient,
  userId: string,
  fav: Omit<FavoriteWorkout, "id">,
): Promise<FavoriteWorkout> {
  const base = {
    user_id: userId,
    name: fav.name,
    exercises: fav.exercises,
  };
  const full = fav.category ? { ...base, category: fav.category } : base;

  let { data, error } = await supabase
    .from("favorite_workouts")
    .insert(full)
    .select()
    .single();

  if (error?.message?.includes("category")) {
    const retry = await supabase
      .from("favorite_workouts")
      .insert(base)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  return rowToFavoriteWorkout(data);
}

export async function deleteFavoriteWorkout(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { error } = await supabase
    .from("favorite_workouts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function fetchDiets(
  supabase: SupabaseClient,
  userId: string,
): Promise<DietLog[]> {
  const { data, error } = await supabase
    .from("diet_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToDiet);
}

export async function insertDiet(
  supabase: SupabaseClient,
  userId: string,
  log: Omit<DietLog, "id">,
): Promise<DietLog> {
  const base = {
    user_id: userId,
    log_date: log.loggedAt.slice(0, 10),
    food_name: log.foodName,
    calories: log.calories,
    protein_g: log.proteinG,
    carbs_g: log.carbsG,
    fat_g: log.fatG,
    sodium_mg: log.sodiumMg ?? 0,
    fiber_g: log.fiberG ?? 0,
    meal_type: log.mealType ?? null,
  };

  let { data, error } = await supabase
    .from("diet_logs")
    .insert({ ...base, logged_at: log.loggedAt })
    .select()
    .single();

  if (error?.message?.includes("logged_at")) {
    const retry = await supabase.from("diet_logs").insert(base).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error?.message?.includes("sodium_mg") || error?.message?.includes("fiber_g")) {
    const { sodium_mg: _s, fiber_g: _f, ...withoutOptional } = base;
    const retry = await supabase
      .from("diet_logs")
      .insert({ ...withoutOptional, logged_at: log.loggedAt })
      .select()
      .single();
    data = retry.data;
    error = retry.error;
    if (error?.message?.includes("logged_at")) {
      const retry2 = await supabase
        .from("diet_logs")
        .insert(withoutOptional)
        .select()
        .single();
      data = retry2.data;
      error = retry2.error;
    }
  }

  if (error) throw error;
  return rowToDiet(data);
}

export async function updateDiet(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  log: Omit<DietLog, "id">,
): Promise<DietLog> {
  const base = {
    log_date: log.loggedAt.slice(0, 10),
    food_name: log.foodName,
    calories: log.calories,
    protein_g: log.proteinG,
    carbs_g: log.carbsG,
    fat_g: log.fatG,
    sodium_mg: log.sodiumMg ?? 0,
    fiber_g: log.fiberG ?? 0,
    meal_type: log.mealType ?? null,
  };

  let { data, error } = await supabase
    .from("diet_logs")
    .update({ ...base, logged_at: log.loggedAt })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error?.message?.includes("logged_at")) {
    const retry = await supabase
      .from("diet_logs")
      .update(base)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error?.message?.includes("sodium_mg") || error?.message?.includes("fiber_g")) {
    const { sodium_mg: _s, fiber_g: _f, ...withoutOptional } = base;
    const retry = await supabase
      .from("diet_logs")
      .update({ ...withoutOptional, logged_at: log.loggedAt })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
    if (error?.message?.includes("logged_at")) {
      const retry2 = await supabase
        .from("diet_logs")
        .update(withoutOptional)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();
      data = retry2.data;
      error = retry2.error;
    }
  }

  if (error) throw error;
  return rowToDiet(data);
}

export async function deleteDiet(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { error } = await supabase
    .from("diet_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function fetchWaterLogs(
  supabase: SupabaseClient,
  userId: string,
): Promise<WaterLogEntry[]> {
  const { data, error } = await supabase
    .from("water_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToWater);
}

export async function insertWaterLog(
  supabase: SupabaseClient,
  userId: string,
  amountMl: number,
  logDate: string,
  loggedAt?: string,
): Promise<WaterLogEntry> {
  const at = loggedAt ?? new Date().toISOString();
  const base = {
    user_id: userId,
    log_date: logDate,
    amount_ml: amountMl,
  };

  let { data, error } = await supabase
    .from("water_logs")
    .insert({ ...base, logged_at: at })
    .select()
    .single();

  if (error?.message?.includes("logged_at")) {
    const retry = await supabase.from("water_logs").insert(base).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  return rowToWater(data);
}

export async function updateWaterLog(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  patch: { amountMl: number; logDate: string; loggedAt: string },
): Promise<WaterLogEntry> {
  const base = {
    amount_ml: patch.amountMl,
    log_date: patch.logDate,
  };

  let { data, error } = await supabase
    .from("water_logs")
    .update({ ...base, logged_at: patch.loggedAt })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error?.message?.includes("logged_at")) {
    const retry = await supabase
      .from("water_logs")
      .update(base)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  return rowToWater(data);
}

export async function deleteWaterLog(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { error } = await supabase
    .from("water_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function fetchFavoriteMeals(
  supabase: SupabaseClient,
  userId: string,
): Promise<FavoriteMeal[]> {
  const { data, error } = await supabase
    .from("favorite_meals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    if (error.message?.includes("favorite_meals")) return [];
    throw error;
  }
  return (data ?? []).map(rowToFavoriteMeal);
}

export async function insertFavoriteMeal(
  supabase: SupabaseClient,
  userId: string,
  meal: Omit<FavoriteMeal, "id">,
): Promise<FavoriteMeal> {
  const { data, error } = await supabase
    .from("favorite_meals")
    .insert({
      user_id: userId,
      name: meal.name,
      calories: meal.calories,
      protein_g: meal.proteinG,
      carbs_g: meal.carbsG,
      fat_g: meal.fatG,
      sodium_mg: meal.sodiumMg ?? 0,
      fiber_g: meal.fiberG ?? 0,
      default_meal_type: meal.defaultMealType ?? null,
    })
    .select()
    .single();
  if (error?.message?.includes("sodium_mg") || error?.message?.includes("fiber_g")) {
    const retry = await supabase
      .from("favorite_meals")
      .insert({
        user_id: userId,
        name: meal.name,
        calories: meal.calories,
        protein_g: meal.proteinG,
        carbs_g: meal.carbsG,
        fat_g: meal.fatG,
        default_meal_type: meal.defaultMealType ?? null,
      })
      .select()
      .single();
    if (retry.error) throw retry.error;
    return rowToFavoriteMeal(retry.data);
  }
  if (error) throw error;
  return rowToFavoriteMeal(data);
}

export async function deleteFavoriteMeal(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { error } = await supabase
    .from("favorite_meals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updateWaterGoal(
  supabase: SupabaseClient,
  userId: string,
  dailyGoalMl: number,
) {
  const { error } = await supabase
    .from("users_profile")
    .update({ daily_water_goal_ml: dailyGoalMl })
    .eq("id", userId);
  if (error) throw error;
}

export async function updateWorkoutVolumeGoal(
  supabase: SupabaseClient,
  userId: string,
  dailyGoalKg: number,
) {
  let { error } = await supabase
    .from("users_profile")
    .update({ daily_workout_volume_goal_kg: dailyGoalKg })
    .eq("id", userId);

  if (error?.message?.includes("daily_workout_volume_goal_kg")) {
    return;
  }
  if (error) throw error;
}

export async function fetchWorkoutSettlements(
  supabase: SupabaseClient,
  userId: string,
): Promise<DailyWorkoutSettlement[]> {
  const { data, error } = await supabase
    .from("workout_daily_settlements")
    .select("log_date, grade, payload, logged_at")
    .eq("user_id", userId)
    .order("log_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToWorkoutSettlement);
}

export async function upsertWorkoutSettlement(
  supabase: SupabaseClient,
  userId: string,
  settlement: DailyWorkoutSettlement,
) {
  const { error } = await supabase.from("workout_daily_settlements").upsert(
    {
      user_id: userId,
      log_date: settlement.logDate,
      grade: settlement.grade,
      payload: settlement,
      logged_at: settlement.loggedAt,
    },
    { onConflict: "user_id,log_date" },
  );
  if (error) throw error;
}

export async function deleteWorkoutSettlement(
  supabase: SupabaseClient,
  userId: string,
  logDate: string,
) {
  const { error } = await supabase
    .from("workout_daily_settlements")
    .delete()
    .eq("user_id", userId)
    .eq("log_date", logDate);
  if (error) throw error;
}

export async function fetchDietSettlements(
  supabase: SupabaseClient,
  userId: string,
): Promise<DailyDietSettlement[]> {
  const { data, error } = await supabase
    .from("diet_daily_settlements")
    .select("log_date, grade, payload, logged_at")
    .eq("user_id", userId)
    .order("log_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToDietSettlement);
}

export async function upsertDietSettlement(
  supabase: SupabaseClient,
  userId: string,
  settlement: DailyDietSettlement,
) {
  const { error } = await supabase.from("diet_daily_settlements").upsert(
    {
      user_id: userId,
      log_date: settlement.logDate,
      grade: settlement.grade,
      payload: settlement,
      logged_at: settlement.loggedAt,
    },
    { onConflict: "user_id,log_date" },
  );
  if (error) throw error;
}

export async function deleteDietSettlement(
  supabase: SupabaseClient,
  userId: string,
  logDate: string,
) {
  const { error } = await supabase
    .from("diet_daily_settlements")
    .delete()
    .eq("user_id", userId)
    .eq("log_date", logDate);
  if (error) throw error;
}

export async function fetchWeeklyGrades(
  supabase: SupabaseClient,
  userId: string,
): Promise<WeeklyGrade[]> {
  const { data, error } = await supabase
    .from("weekly_grades")
    .select("year, week_number, grade, ai_summary")
    .eq("user_id", userId)
    .order("year", { ascending: false })
    .order("week_number", { ascending: false })
    .limit(12);
  if (error) throw error;
  return (data ?? []).map(rowToWeeklyGrade);
}

export async function upsertWeeklyGrade(
  supabase: SupabaseClient,
  userId: string,
  grade: WeeklyGrade & { year: number; weekNumber: number },
) {
  const { error } = await supabase.from("weekly_grades").upsert(
    {
      user_id: userId,
      year: grade.year,
      week_number: grade.weekNumber,
      grade: grade.grade,
      ai_summary: grade.summary,
      evaluated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,year,week_number" },
  );
  if (error) throw error;
}

export function getIsoWeek(d = new Date()): { year: number; weekNumber: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { year: date.getUTCFullYear(), weekNumber };
}
