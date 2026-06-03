"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { MobileChat } from "@/components/chat/MobileChat";
import { ControlRoomTab } from "@/components/dashboard/ControlRoomTab";
import { DungeonTab } from "@/components/dashboard/DungeonTab";
import { TavernTab } from "@/components/dashboard/TavernTab";
import { BottomTabNav } from "@/components/layout/BottomTabNav";
import { DEFAULT_BODY_GOALS } from "@/lib/body-goals";
import { getSupabase } from "@/lib/supabase/client";
import {
  appendInbodyRecord,
  fetchDietSettlements,
  fetchDiets,
  fetchProfile,
  fetchWaterLogs,
  fetchWeeklyGrades,
  fetchWorkoutSettlements,
  fetchWorkouts,
  insertDiet,
  insertWaterLog,
  insertWorkout,
  saveBodyGoals,
  updateProfile,
  updateWaterGoal,
  upsertDietSettlement,
  upsertWeeklyGrade,
  upsertWorkoutSettlement,
} from "@/lib/supabase/repository";
import type {
  BodyGoals,
  DailyDietSettlement,
  DailyWorkoutSettlement,
  DietLog,
  InbodyRecord,
  ProfileUpdatePayload,
  TabId,
  UserProfile,
  WeeklyGrade,
  WorkoutLog,
} from "@/lib/types";
import type { WaterLogEntry } from "@/lib/water-intake";

const CHAT_CONFIG: Record<
  TabId,
  {
    endpoint: string;
    placeholder: string;
    welcome: string;
    image?: boolean;
    imageHint?: string;
  }
> = {
  control: {
    endpoint: "/api/chat/inbody",
    placeholder: "或輸入體重、體脂…",
    welcome:
      "點 📷 上傳 InBody 截圖，我會自動讀取並更新你的體態數據。也可直接打字輸入數字。",
    image: true,
    imageHint: "InBody",
  },
  dungeon: {
    endpoint: "/api/chat/workout",
    placeholder: "問訓練問題…",
    welcome: "今日評分請用頁面上方「上傳健身截圖」。",
    image: true,
    imageHint: "健身",
  },
  tavern: {
    endpoint: "/api/chat/diet",
    placeholder: "吃了什麼？或拍食物照片…",
    welcome: "描述餐點或拍照；整日評分請用「結算今日飲食」。",
    image: true,
    imageHint: "食物",
  },
};

const SCROLL_PAD = "calc(var(--tab-h) + var(--safe-bottom) + 20px)";

interface DashboardProps {
  session: Session;
  initialProfile: UserProfile;
  initialGoals: BodyGoals;
  onProfilePersist?: (p: UserProfile) => void;
  onGoalsPersist?: (g: BodyGoals) => void;
}

export function Dashboard({
  session,
  initialProfile,
  initialGoals,
  onProfilePersist,
  onGoalsPersist,
}: DashboardProps) {
  const userId = session.user.id;
  const supabase = getSupabase();

  const [tab, setTab] = useState<TabId>("control");
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [bodyGoals, setBodyGoals] = useState<BodyGoals>(initialGoals);
  const [diets, setDiets] = useState<DietLog[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLogEntry[]>([]);
  const [workoutSettlements, setWorkoutSettlements] = useState<
    DailyWorkoutSettlement[]
  >([]);
  const [dietSettlements, setDietSettlements] = useState<DailyDietSettlement[]>(
    [],
  );
  const [weeklyGrades, setWeeklyGrades] = useState<WeeklyGrade[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [xpPop, setXpPop] = useState<number | null>(null);
  const [levelPulse, setLevelPulse] = useState(false);

  const refreshData = useCallback(async () => {
    const [w, d, water, ws, ds, wg] = await Promise.all([
      fetchWorkouts(supabase, userId),
      fetchDiets(supabase, userId),
      fetchWaterLogs(supabase, userId),
      fetchWorkoutSettlements(supabase, userId),
      fetchDietSettlements(supabase, userId),
      fetchWeeklyGrades(supabase, userId),
    ]);
    setWorkouts(w);
    setDiets(d);
    setWaterLogs(water);
    setWorkoutSettlements(ws);
    setDietSettlements(ds);
    setWeeklyGrades(wg);
  }, [supabase, userId]);

  useEffect(() => {
    refreshData().finally(() => setDataLoading(false));
  }, [refreshData]);

  const persistProfile = useCallback(
    async (next: UserProfile) => {
      setProfile(next);
      onProfilePersist?.(next);
      await updateProfile(supabase, next);
    },
    [supabase, onProfilePersist],
  );

  function applyXp(gained: number) {
    if (gained <= 0) return;
    setProfile((p) => {
      let level = p.level;
      let xp = p.xp + gained;
      let xpToNext = p.xpToNext;
      let leveled = false;
      while (xp >= xpToNext) {
        xp -= xpToNext;
        level += 1;
        xpToNext = Math.round(xpToNext * 1.15);
        leveled = true;
      }
      const next = { ...p, level, xp, xpToNext };
      void persistProfile(next);
      return next;
    });
    setXpPop(gained);
    setTimeout(() => setXpPop(null), 1000);
    if (gained >= 40) {
      setLevelPulse(true);
      setTimeout(() => setLevelPulse(false), 1200);
    }
  }

  async function handleGoalsChange(goals: BodyGoals) {
    setBodyGoals(goals);
    onGoalsPersist?.(goals);
    await saveBodyGoals(supabase, userId, goals);
  }

  const chat = CHAT_CONFIG[tab];

  async function handleChatUpdate(data: unknown) {
    if (tab === "control") {
      const payload = data as {
        inbodyRecord?: InbodyRecord;
        profileUpdate?: ProfileUpdatePayload;
      };
      if (payload?.inbodyRecord) {
        await appendInbodyRecord(supabase, userId, payload.inbodyRecord);
        const refreshed = await fetchProfile(supabase, userId);
        if (refreshed) {
          setProfile(refreshed.profile);
          setBodyGoals(refreshed.goals);
          onProfilePersist?.(refreshed.profile);
        }
      }
      if (payload?.profileUpdate?.xpGained) {
        applyXp(payload.profileUpdate.xpGained);
      }
      return;
    }

    if (tab === "tavern") {
      const payload = data as {
        food_name?: string;
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
      };
      const calories = payload?.calories;
      if (calories == null || calories <= 0) return;
      const now = new Date();
      const hour = now.getHours();
      const mealType =
        hour < 10
          ? "breakfast"
          : hour < 15
            ? "lunch"
            : hour < 21
              ? "dinner"
              : "snack";

      const inserted = await insertDiet(supabase, userId, {
        foodName: payload.food_name ?? "未知食物",
        calories,
        proteinG: payload.protein ?? 0,
        carbsG: payload.carbs ?? 0,
        fatG: payload.fat ?? 0,
        loggedAt: now.toISOString(),
        mealType,
      });
      setDiets((prev) => [inserted, ...prev]);
    }
  }

  async function addWorkout(log: Omit<WorkoutLog, "id">) {
    const inserted = await insertWorkout(supabase, userId, log);
    setWorkouts((prev) => [inserted, ...prev]);
  }

  async function handleWaterAdd(amountMl: number) {
    const entry = await insertWaterLog(
      supabase,
      userId,
      amountMl,
      new Date().toISOString().slice(0, 10),
    );
    setWaterLogs((prev) => [entry, ...prev]);
  }

  async function handleWaterGoalChange(goalMl: number) {
    await updateWaterGoal(supabase, userId, goalMl);
    const next = {
      ...profile,
      dailyWaterGoalMl: goalMl,
    };
    await persistProfile(next);
  }

  async function handleWorkoutSettlementSaved(s: DailyWorkoutSettlement) {
    await upsertWorkoutSettlement(supabase, userId, s);
    const list = await fetchWorkoutSettlements(supabase, userId);
    setWorkoutSettlements(list);
  }

  async function handleDietSettlementSaved(s: DailyDietSettlement) {
    await upsertDietSettlement(supabase, userId, s);
    const list = await fetchDietSettlements(supabase, userId);
    setDietSettlements(list);
  }

  async function handleWeeklyGradeGenerated(g: WeeklyGrade) {
    if (g.year == null || g.weekNumber == null) return;
    await upsertWeeklyGrade(supabase, userId, {
      ...g,
      year: g.year,
      weekNumber: g.weekNumber,
    });
    const list = await fetchWeeklyGrades(supabase, userId);
    setWeeklyGrades(list);
  }

  if (dataLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-text-muted">
        同步資料中…
      </div>
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="app-shell">
      <div className="flex items-center justify-end px-4 pt-2">
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-xs text-text-muted underline"
        >
          登出
        </button>
      </div>
      <div
        className="app-scroll px-4 pt-2"
        style={{ paddingBottom: SCROLL_PAD }}
      >
        {tab === "control" && (
          <ControlRoomTab
            profile={profile}
            goals={bodyGoals}
            onGoalsChange={handleGoalsChange}
            xpPop={xpPop}
            levelPulse={levelPulse}
          />
        )}
        {tab === "dungeon" && (
          <DungeonTab
            profile={profile}
            workouts={workouts}
            settlementHistory={workoutSettlements}
            onAddWorkout={addWorkout}
            onSettlementSaved={handleWorkoutSettlementSaved}
            onSettlement={({ xpGained }) => applyXp(xpGained ?? 0)}
          />
        )}
        {tab === "tavern" && (
          <TavernTab
            profile={profile}
            diets={diets}
            waterLogs={waterLogs}
            settlementHistory={dietSettlements}
            workoutSettlements={workoutSettlements}
            weeklyGrades={weeklyGrades}
            onWaterAdd={handleWaterAdd}
            onWaterGoalChange={handleWaterGoalChange}
            onSettlementSaved={handleDietSettlementSaved}
            onWeeklyGradeGenerated={handleWeeklyGradeGenerated}
            onSettlement={({ xpGained }) => applyXp(xpGained ?? 0)}
          />
        )}
      </div>

      <MobileChat
        key={tab}
        apiEndpoint={chat.endpoint}
        placeholder={chat.placeholder}
        welcomeMessage={chat.welcome}
        allowImageUpload={chat.image}
        imageHint={chat.imageHint}
        onProfileUpdate={handleChatUpdate}
      />

      <BottomTabNav active={tab} onChange={setTab} />
    </div>
  );
}
