"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { MobileChat } from "@/components/chat/MobileChat";
import { AppBottomBar } from "@/components/layout/AppBottomBar";
import { ControlRoomTab } from "@/components/dashboard/ControlRoomTab";
import { DungeonTab } from "@/components/dashboard/DungeonTab";
import { TavernTab } from "@/components/dashboard/TavernTab";
import { DEFAULT_BODY_GOALS } from "@/lib/body-goals";
import { useSwipeTabs } from "@/lib/use-swipe-tabs";
import { useAppPreferences } from "@/lib/use-app-preferences";
import { useKeyboardOpen } from "@/lib/use-keyboard-open";
import { combineDateAndTime, nowTimeStr } from "@/lib/logged-at";
import { resolveNutritionGoalsForDisplay } from "@/lib/nutrition-goals";
import { getSupabase } from "@/lib/supabase/client";
import {
  appendInbodyRecord,
  deleteDiet,
  deleteDietSettlement,
  deleteFavoriteMeal,
  deleteFavoriteWorkout,
  deleteWaterLog,
  deleteWeeklyGrade,
  deleteWorkout,
  deleteWorkoutSettlement,
  fetchDietSettlements,
  fetchDiets,
  fetchFavoriteMeals,
  fetchFavoriteWorkouts,
  fetchProfile,
  fetchWaterLogs,
  fetchWeeklyGrades,
  fetchWorkoutSettlements,
  fetchWorkouts,
  insertDiet,
  insertFavoriteMeal,
  insertFavoriteWorkout,
  insertWaterLog,
  insertWorkout,
  saveBodyGoals,
  syncNutritionGoalsFromInbody,
  syncNutritionGoalsIfStale,
  updateDiet,
  updateFavoriteWorkout,
  updateProfile,
  updateWaterGoal,
  updateWorkoutVolumeGoal,
  updateWaterLog,
  upsertDietSettlement,
  upsertWeeklyGrade,
  upsertWorkoutSettlement,
} from "@/lib/supabase/repository";
import type {
  BodyGoals,
  DailyDietSettlement,
  DailyWorkoutSettlement,
  DietLog,
  FavoriteMeal,
  FavoriteWorkout,
  InbodyRecord,
  ProfileUpdatePayload,
  TabId,
  UserProfile,
  WeeklyGrade,
  WorkoutLog,
} from "@/lib/types";
import type { WaterLogEntry } from "@/lib/water-intake";

const CHAT_CONFIG: Record<
  Exclude<TabId, "tavern">,
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
};

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
  const keyboardOpen = useKeyboardOpen();
  const { swipeTabsEnabled, setSwipeTabsEnabled } = useAppPreferences();

  function switchTab(next: TabId) {
    setTab(next);
    document.querySelector(".app-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  const swipeTabs = useSwipeTabs(tab, switchTab, {
    enabled: swipeTabsEnabled && !keyboardOpen,
  });
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
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([]);
  const [workoutFavorites, setWorkoutFavorites] = useState<FavoriteWorkout[]>(
    [],
  );
  const [nutritionRationale, setNutritionRationale] = useState<string | null>(
    null,
  );

  const refreshData = useCallback(async () => {
    const [w, d, water, ws, ds, wg, fav, wfav] = await Promise.all([
      fetchWorkouts(supabase, userId),
      fetchDiets(supabase, userId),
      fetchWaterLogs(supabase, userId),
      fetchWorkoutSettlements(supabase, userId),
      fetchDietSettlements(supabase, userId),
      fetchWeeklyGrades(supabase, userId),
      fetchFavoriteMeals(supabase, userId),
      fetchFavoriteWorkouts(supabase, userId),
    ]);
    setWorkouts(w);
    setDiets(d);
    setWaterLogs(water);
    setWorkoutSettlements(ws);
    setDietSettlements(ds);
    setWeeklyGrades(wg);
    setFavorites(fav);
    setWorkoutFavorites(wfav);
  }, [supabase, userId]);

  useEffect(() => {
    (async () => {
      try {
        const stale = await syncNutritionGoalsIfStale(supabase, userId);
        if (stale) {
          setProfile(stale.profile);
          onProfilePersist?.(stale.profile);
          setNutritionRationale(stale.rationale);
        }
      } catch (e) {
        console.warn("[nutrition-goals] sync on load failed", e);
      }
      await refreshData();
    })().finally(() => setDataLoading(false));
  }, [refreshData, supabase, userId, onProfilePersist]);

  useEffect(() => {
    if (tab !== "dungeon") return;
    void refreshData();
  }, [tab, refreshData]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void refreshData();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
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
    if (profile.inbodyHistory.length > 0) {
      try {
        const synced = await syncNutritionGoalsFromInbody(supabase, userId);
        if (synced) {
          setProfile(synced.profile);
          onProfilePersist?.(synced.profile);
          setNutritionRationale(synced.rationale);
        }
      } catch {
        /* ignore */
      }
    }
  }

  const nutritionDisplay = useMemo(
    () => resolveNutritionGoalsForDisplay(profile, bodyGoals),
    [profile, bodyGoals],
  );

  const nutritionHint =
    nutritionRationale ?? (nutritionDisplay.rationale || null);

  const chat =
    tab === "tavern" ? null : CHAT_CONFIG[tab];

  async function handleDietAdd(
    log: Omit<DietLog, "id">,
    options?: { addToFavorites?: boolean; favoriteBundleName?: string },
  ) {
    const inserted = await insertDiet(supabase, userId, log);
    setDiets((prev) => [inserted, ...prev]);
    if (options?.addToFavorites) {
      try {
        const fav = await insertFavoriteMeal(supabase, userId, {
          name: log.foodName,
          bundleName: options.favoriteBundleName,
          calories: log.calories,
          proteinG: log.proteinG,
          carbsG: log.carbsG,
          fatG: log.fatG,
          sodiumMg: log.sodiumMg ?? 0,
          fiberG: log.fiberG ?? 0,
          defaultMealType: log.mealType,
        });
        setFavorites((prev) => [fav, ...prev]);
      } catch (e) {
        console.warn("[favorites] save failed", e);
      }
    }
  }

  async function handleDietUpdate(id: string, log: Omit<DietLog, "id">) {
    const updated = await updateDiet(supabase, userId, id, log);
    setDiets((prev) => prev.map((d) => (d.id === id ? updated : d)));
  }

  async function handleDietDelete(id: string) {
    await deleteDiet(supabase, userId, id);
    setDiets((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleFavoriteDelete(id: string) {
    await deleteFavoriteMeal(supabase, userId, id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleChatUpdate(
    data: unknown,
    context?: { userMessage?: string },
  ) {
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
        try {
          const synced = await syncNutritionGoalsFromInbody(supabase, userId);
          if (synced) {
            setProfile(synced.profile);
            onProfilePersist?.(synced.profile);
            setNutritionRationale(synced.rationale);
          }
        } catch (e) {
          console.warn("[nutrition-goals] sync after InBody failed", e);
          const display = resolveNutritionGoalsForDisplay(
            refreshed?.profile ?? profile,
            refreshed?.goals ?? bodyGoals,
          );
          if (display.fromInbody) {
            setProfile((p) => ({
              ...p,
              dailyCalorieGoal: display.calories,
              dailyProteinGoal: display.proteinG,
              dailyCarbsGoal: display.carbsG,
              dailyFatGoal: display.fatG,
            }));
            setNutritionRationale(display.rationale);
          }
        }
      }
      if (payload?.profileUpdate?.xpGained) {
        applyXp(payload.profileUpdate.xpGained);
      }
      return;
    }

  }

  async function addWorkout(log: Omit<WorkoutLog, "id">) {
    const inserted = await insertWorkout(supabase, userId, log);
    setWorkouts((prev) => [inserted, ...prev]);
  }

  async function handleWorkoutDelete(id: string) {
    await deleteWorkout(supabase, userId, id);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }

  async function handleWorkoutFavoriteSave(fav: Omit<FavoriteWorkout, "id">) {
    const inserted = await insertFavoriteWorkout(supabase, userId, fav);
    setWorkoutFavorites((prev) => [inserted, ...prev]);
  }

  async function handleWorkoutFavoriteDelete(id: string) {
    await deleteFavoriteWorkout(supabase, userId, id);
    setWorkoutFavorites((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleWorkoutFavoriteRename(id: string, name: string) {
    const updated = await updateFavoriteWorkout(supabase, userId, id, { name });
    setWorkoutFavorites((prev) =>
      prev.map((f) => (f.id === id ? updated : f)),
    );
  }

  async function handleWaterAdd(amountMl: number, logDate: string) {
    const loggedAt = combineDateAndTime(logDate, nowTimeStr());
    const entry = await insertWaterLog(
      supabase,
      userId,
      amountMl,
      logDate,
      loggedAt,
    );
    setWaterLogs((prev) => [entry, ...prev]);
  }

  async function handleWaterUpdate(
    id: string,
    patch: { amountMl: number; logDate: string; loggedAt: string },
  ) {
    const updated = await updateWaterLog(supabase, userId, id, patch);
    setWaterLogs((prev) => prev.map((w) => (w.id === id ? updated : w)));
  }

  async function handleWaterDelete(id: string) {
    await deleteWaterLog(supabase, userId, id);
    setWaterLogs((prev) => prev.filter((w) => w.id !== id));
  }

  async function handleWaterGoalChange(goalMl: number) {
    await updateWaterGoal(supabase, userId, goalMl);
    const next = {
      ...profile,
      dailyWaterGoalMl: goalMl,
    };
    await persistProfile(next);
  }

  async function handleWorkoutVolumeGoalChange(goalKg: number) {
    await updateWorkoutVolumeGoal(supabase, userId, goalKg);
    setProfile((p) => ({ ...p, dailyWorkoutVolumeGoalKg: goalKg }));
  }

  async function handleWorkoutSettlementSaved(s: DailyWorkoutSettlement) {
    await upsertWorkoutSettlement(supabase, userId, s);
    const list = await fetchWorkoutSettlements(supabase, userId);
    setWorkoutSettlements(list);
  }

  async function handleWorkoutSettlementDelete(s: DailyWorkoutSettlement) {
    await deleteWorkoutSettlement(supabase, userId, s.logDate);
    setWorkoutSettlements((prev) =>
      prev.filter((x) => x.logDate !== s.logDate),
    );
  }

  async function handleDietSettlementSaved(s: DailyDietSettlement) {
    await upsertDietSettlement(supabase, userId, s);
    const list = await fetchDietSettlements(supabase, userId);
    setDietSettlements(list);
  }

  async function handleDietSettlementDelete(s: DailyDietSettlement) {
    await deleteDietSettlement(supabase, userId, s.logDate);
    setDietSettlements((prev) => prev.filter((x) => x.logDate !== s.logDate));
  }

  async function handleWeeklyGradeDelete(g: WeeklyGrade) {
    if (g.year == null || g.weekNumber == null) return;
    await deleteWeeklyGrade(supabase, userId, g.year, g.weekNumber);
    setWeeklyGrades((prev) =>
      prev.filter(
        (x) => !(x.year === g.year && x.weekNumber === g.weekNumber),
      ),
    );
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
      <div
        className="app-scroll px-4 pt-2"
        {...(swipeTabsEnabled
          ? {
              onTouchStart: swipeTabs.onTouchStart,
              onTouchEnd: swipeTabs.onTouchEnd,
            }
          : {})}
      >
        <div className="app-top-bar">
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-xs text-text-muted underline"
          >
            登出
          </button>
        </div>
        {tab === "control" && (
          <ControlRoomTab
            profile={profile}
            goals={bodyGoals}
            weeklyGrades={weeklyGrades}
            onGoalsChange={handleGoalsChange}
            xpPop={xpPop}
            levelPulse={levelPulse}
          />
        )}
        {tab === "dungeon" && (
          <DungeonTab
            profile={profile}
            workouts={workouts}
            favoriteWorkouts={workoutFavorites}
            settlementHistory={workoutSettlements}
            onAddWorkout={addWorkout}
            onDeleteWorkout={handleWorkoutDelete}
            onSaveFavoriteWorkout={handleWorkoutFavoriteSave}
            onDeleteFavoriteWorkout={handleWorkoutFavoriteDelete}
            onRenameFavoriteWorkout={handleWorkoutFavoriteRename}
            onSettlementSaved={handleWorkoutSettlementSaved}
            onDeleteSettlement={handleWorkoutSettlementDelete}
            onVolumeGoalChange={handleWorkoutVolumeGoalChange}
            onSettlement={({ xpGained }) => applyXp(xpGained ?? 0)}
            onRefresh={refreshData}
          />
        )}
        {tab === "tavern" && (
          <TavernTab
            profile={profile}
            bodyGoals={bodyGoals}
            nutritionRationale={nutritionHint}
            nutritionGoals={nutritionDisplay}
            diets={diets}
            waterLogs={waterLogs}
            favorites={favorites}
            settlementHistory={dietSettlements}
            workoutSettlements={workoutSettlements}
            weeklyGrades={weeklyGrades}
            onDietAdd={handleDietAdd}
            onDietUpdate={handleDietUpdate}
            onDietDelete={handleDietDelete}
            onFavoriteDelete={handleFavoriteDelete}
            onWaterAdd={handleWaterAdd}
            onWaterUpdate={handleWaterUpdate}
            onWaterDelete={handleWaterDelete}
            onWaterGoalChange={handleWaterGoalChange}
            onSettlementSaved={handleDietSettlementSaved}
            onDeleteSettlement={handleDietSettlementDelete}
            onWeeklyGradeGenerated={handleWeeklyGradeGenerated}
            onDeleteWeeklyGrade={handleWeeklyGradeDelete}
            onSettlement={({ xpGained }) => applyXp(xpGained ?? 0)}
          />
        )}
      </div>

      <AppBottomBar
        active={tab}
        onChange={switchTab}
        swipeTabsEnabled={swipeTabsEnabled}
        onSwipeTabsEnabledChange={setSwipeTabsEnabled}
      />

      {chat && (
        <MobileChat
          key={tab}
          apiEndpoint={chat.endpoint}
          placeholder={chat.placeholder}
          welcomeMessage={chat.welcome}
          allowImageUpload={chat.image}
          imageHint={chat.imageHint}
          onProfileUpdate={handleChatUpdate}
        />
      )}

    </div>
  );
}
