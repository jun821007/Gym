export type TabId = "control" | "dungeon" | "tavern";

export type StatKey = "str" | "vit" | "agi" | "san";

/** 體態首頁任務目標 */
export interface BodyGoals {
  targetWeightKg: number;
  targetBodyFatPct: number;
  targetMuscleKg: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
  level: number;
  xp: number;
  xpToNext: number;
  str: number;
  vit: number;
  agi: number;
  san: number;
  inbodyHistory: InbodyRecord[];
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
  dailyCarbsGoal: number;
  dailyFatGoal: number;
  dailyWaterGoalMl?: number;
  /** 營養目標最後依據的 InBody 日期 YYYY-MM-DD */
  nutritionGoalsInbodyDate?: string;
}

export interface InbodyRecord {
  recorded_at: string;
  weight_kg: number;
  body_fat_pct?: number;
  skeletal_muscle_kg?: number;
  bmi?: number;
  source?: string;
}

export type WorkoutLoadType =
  | "bilateral"
  | "unilateral"
  | "bodyweight"
  | "weighted_bw"
  | "assisted_bw";

export interface WorkoutSetDetail {
  reps: number;
  weightKg?: number;
  gear?: ("strap" | "belt" | "knee")[];
}

export interface WorkoutLog {
  id: string;
  exerciseName: string;
  loadType: WorkoutLoadType;
  weightKg: number;
  extraWeightKg?: number;
  assistKg?: number;
  reps: number;
  sets: number;
  setDetails?: WorkoutSetDetail[];
  /** YYYY-MM-DD */
  logDate: string;
  /** ISO 8601，打卡當下時間 */
  loggedAt: string;
}

export type WorkoutCategory = "back" | "legs" | "chest" | "shoulders";

export interface FavoriteWorkoutExercise {
  exerciseName: string;
  loadType: WorkoutLoadType;
  weightKg?: number;
  extraWeightKg?: number;
  assistKg?: number;
  setDetails?: WorkoutSetDetail[];
  reps?: number;
  sets?: number;
}

export interface FavoriteWorkout {
  id: string;
  name: string;
  category?: WorkoutCategory | null;
  exercises: FavoriteWorkoutExercise[];
}

export interface DietLog {
  id: string;
  foodName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** ISO 8601，用餐時間 */
  loggedAt: string;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
  imageUrl?: string;
}

export interface FavoriteMeal {
  id: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  defaultMealType?: DietLog["mealType"];
}

export interface DietSettlementMeal {
  foodName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  loggedAt: string;
}

/** 每日飲食＋飲水綜合結算 */
export interface DailyDietSettlement {
  grade: RankGrade;
  summary: string;
  logDate: string;
  loggedAt: string;
  mealCount: number;
  meals: DietSettlementMeal[];
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  goals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    waterMl: number;
  };
  waterMl: number;
  waterGoalMl: number;
  waterPct: number;
  scores: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
    overall: number;
  };
}

export type RankGrade = "S" | "A" | "B" | "C" | "D";

export interface WeeklyGrade {
  weekLabel: string;
  grade: "S" | "A" | "B" | "C";
  summary: string;
  year?: number;
  weekNumber?: number;
}

/** 結算清單中的單組明細 */
export interface SettlementSetLine {
  weightKg: number;
  reps: number;
}

/** 結算時納入的手動打卡項目 */
export interface SettlementManualLog {
  exerciseName: string;
  /** 向下相容：平均重量 */
  weightKg: number;
  /** 向下相容：平均次數 */
  reps: number;
  /** 向下相容：組數 */
  sets: number;
  /** 逐組明細（結算畫面顯示用） */
  setLines?: SettlementSetLine[];
  /** 此動作總訓練量 */
  volumeKg?: number;
  loadType?: WorkoutLoadType;
}

/** 每日訓練結算（健身 App 截圖 + 今日清單綜合評分） */
export interface DailyWorkoutSettlement {
  grade: RankGrade;
  workoutName: string;
  durationMinutes: number;
  activeCalories: number;
  totalCalories: number;
  avgHeartRate: number;
  summary: string;
  logDate: string;
  loggedAt: string;
  manualLogs: SettlementManualLog[];
  totalVolumeKg: number;
  bodyWeightKg?: number | null;
  volumePerBodyWeight?: number | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ProfileUpdatePayload {
  level: number;
  xp: number;
  xpToNext: number;
  str: number;
  vit: number;
  agi: number;
  san: number;
  xpGained?: number;
  leveledUp?: boolean;
}
