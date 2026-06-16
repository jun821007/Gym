import type { DietLog, UserProfile, WeeklyGrade, WorkoutLog } from "./types";
import { toDateKey } from "./datetime";

const today = toDateKey();
const d = (offset: number) => {
  const x = new Date();
  x.setDate(x.getDate() - offset);
  return toDateKey(x);
};

export const MOCK_PROFILE: UserProfile = {
  id: "demo-user",
  displayName: "冒險者",
  level: 12,
  xp: 340,
  xpToNext: 500,
  str: 68,
  vit: 54,
  agi: 71,
  san: 45,
  dailyCalorieGoal: 2200,
  dailyProteinGoal: 150,
  dailyCarbsGoal: 250,
  dailyFatGoal: 70,
  inbodyHistory: [
    {
      recorded_at: "2026-05-06",
      weight_kg: 74.2,
      body_fat_pct: 20.1,
      skeletal_muscle_kg: 31.2,
    },
    {
      recorded_at: "2026-05-13",
      weight_kg: 73.5,
      body_fat_pct: 19.4,
      skeletal_muscle_kg: 31.5,
    },
    {
      recorded_at: "2026-05-20",
      weight_kg: 72.8,
      body_fat_pct: 18.9,
      skeletal_muscle_kg: 31.8,
    },
    {
      recorded_at: "2026-05-27",
      weight_kg: 72.1,
      body_fat_pct: 18.2,
      skeletal_muscle_kg: 32.0,
    },
    {
      recorded_at: "2026-06-03",
      weight_kg: 71.5,
      body_fat_pct: 17.8,
      skeletal_muscle_kg: 32.2,
    },
  ],
};

export const MOCK_WORKOUTS: WorkoutLog[] = [
  {
    id: "w1",
    exerciseName: "深蹲",
    loadType: "bilateral",
    weightKg: 80,
    reps: 8,
    sets: 4,
    logDate: today,
    loggedAt: `${today}T18:30:00`,
  },
  {
    id: "w2",
    exerciseName: "臥推",
    loadType: "bilateral",
    weightKg: 60,
    reps: 8,
    sets: 3,
    logDate: today,
    loggedAt: `${today}T18:45:00`,
  },
  {
    id: "w3",
    exerciseName: "硬舉",
    loadType: "bilateral",
    weightKg: 100,
    reps: 5,
    sets: 3,
    logDate: d(1),
    loggedAt: `${d(1)}T19:10:00`,
  },
  {
    id: "w4",
    exerciseName: "肩推",
    loadType: "bilateral",
    weightKg: 40,
    reps: 10,
    sets: 3,
    logDate: d(1),
    loggedAt: `${d(1)}T19:25:00`,
  },
  {
    id: "w5",
    exerciseName: "深蹲",
    loadType: "bilateral",
    weightKg: 77.5,
    reps: 8,
    sets: 4,
    logDate: d(3),
    loggedAt: `${d(3)}T17:50:00`,
  },
  {
    id: "w6",
    exerciseName: "引體向上",
    loadType: "bodyweight",
    weightKg: 0,
    reps: 8,
    sets: 4,
    logDate: d(5),
    loggedAt: `${d(5)}T20:00:00`,
  },
];

export const MOCK_DIETS: DietLog[] = [
  {
    id: "1",
    foodName: "雞胸沙拉",
    calories: 420,
    proteinG: 45,
    carbsG: 18,
    fatG: 12,
    sodiumMg: 480,
    fiberG: 6,
    loggedAt: `${today}T08:15:00`,
    mealType: "breakfast",
  },
  {
    id: "2",
    foodName: "燕麥奶昔",
    calories: 280,
    proteinG: 22,
    carbsG: 35,
    fatG: 6,
    sodiumMg: 120,
    fiberG: 4,
    loggedAt: `${today}T15:40:00`,
    mealType: "lunch",
  },
  {
    id: "3",
    foodName: "糙米便當",
    calories: 650,
    proteinG: 28,
    carbsG: 82,
    fatG: 18,
    sodiumMg: 980,
    fiberG: 8,
    loggedAt: `${d(1)}T12:20:00`,
    mealType: "lunch",
  },
];

export const MOCK_WEEKLY_GRADES: WeeklyGrade[] = [
  { weekLabel: "W21", grade: "B", summary: "蛋白質略低，重訓表現穩定。" },
  { weekLabel: "W22", grade: "A", summary: "睡眠改善，體脂下降 0.4%。" },
];
