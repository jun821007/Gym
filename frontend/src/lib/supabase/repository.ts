import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BodyGoals,
  DailyDietSettlement,
  DailyWorkoutSettlement,
  DietLog,
  InbodyRecord,
  UserProfile,
  WeeklyGrade,
  WorkoutLog,
} from "@/lib/types";
import type { WaterLogEntry } from "@/lib/water-intake";
import {
  rowToBodyGoals,
  rowToDiet,
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

export async function insertWorkout(
  supabase: SupabaseClient,
  userId: string,
  log: Omit<WorkoutLog, "id">,
): Promise<WorkoutLog> {
  const { data, error } = await supabase
    .from("workout_logs")
    .insert({
      user_id: userId,
      log_date: log.logDate,
      exercise_name: log.exerciseName,
      weight_kg: log.weightKg,
      reps: log.reps,
      sets: log.sets,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToWorkout(data);
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
  const { data, error } = await supabase
    .from("diet_logs")
    .insert({
      user_id: userId,
      log_date: log.loggedAt.slice(0, 10),
      food_name: log.foodName,
      calories: log.calories,
      protein_g: log.proteinG,
      carbs_g: log.carbsG,
      fat_g: log.fatG,
      meal_type: log.mealType ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToDiet(data);
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
): Promise<WaterLogEntry> {
  const { data, error } = await supabase
    .from("water_logs")
    .insert({
      user_id: userId,
      log_date: logDate,
      amount_ml: amountMl,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToWater(data);
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
