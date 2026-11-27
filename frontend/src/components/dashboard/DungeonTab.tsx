"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FavoriteWorkoutsPanel } from "@/components/dashboard/FavoriteWorkoutsPanel";
import { WorkoutMenusPanel } from "@/components/dashboard/WorkoutMenusPanel";
import {
  WorkoutAddForm,
  type WorkoutFormPrefill,
} from "@/components/dashboard/WorkoutAddForm";
import { WorkoutGradeHistory } from "@/components/dashboard/WorkoutGradeHistory";
import { WorkoutGroupedList } from "@/components/dashboard/WorkoutGroupedList";
import { WorkoutSettlementModal } from "@/components/dashboard/WorkoutSettlementModal";
import { WorkoutVolumeGoalBar } from "@/components/dashboard/WorkoutVolumeGoalBar";
import { Card } from "@/components/ui/Card";
import { FullScreenSheet } from "@/components/ui/FullScreenSheet";
import {
  formatDateLabel,
  groupByDateKey,
  gymDayDateKey,
  isSameDateKey,
  isToday,
  suggestSettleDateKey,
  toDateKey,
  yesterdayDateKey,
} from "@/lib/datetime";
import { useAppPreferences } from "@/lib/use-app-preferences";
import type { DungeonBringInTab } from "@/lib/app-preferences";
import { fileToCompressedBase64 } from "@/lib/image-compress";
import {
  buildBodyMetricsPayload,
  calcTotalVolumeKg,
  formatLogsForApi,
  toSettlementLogs,
} from "@/lib/workout-grading";
import type {
  DailyWorkoutSettlement,
  FavoriteWorkout,
  FavoriteWorkoutExercise,
  UserProfile,
  WorkoutLog,
} from "@/lib/types";
import {
  countWorkoutSets,
  groupWorkoutsByExercise,
} from "@/lib/workout-grouping";
import { getLatestInbodyRecord } from "@/lib/nutrition-goals";
import { getLatestBodyWeightKg } from "@/lib/workout-volume";
import {
  effectiveWorkoutVolumeGoalKg,
  suggestWorkoutVolumeGoalKg,
} from "@/lib/workout-volume-goal";
import {
  clearWorkoutDraft,
  loadWorkoutDraft,
  patchWorkoutDraft,
} from "@/lib/workout-draft";
import { RANK_GRADE_BADGE } from "@/lib/rank-grade";
import { cn } from "@/lib/utils";

interface DungeonTabProps {
  profile: UserProfile;
  workouts: WorkoutLog[];
  favoriteWorkouts: FavoriteWorkout[];
  settlementHistory: DailyWorkoutSettlement[];
  onAddWorkout: (log: Omit<WorkoutLog, "id">) => void | Promise<void>;
  onDeleteWorkout?: (id: string) => void | Promise<void>;
  onSaveFavoriteWorkout?: (fav: Omit<FavoriteWorkout, "id">) => void | Promise<void>;
  onDeleteFavoriteWorkout?: (id: string) => void | Promise<void>;
  onRenameFavoriteWorkout?: (id: string, name: string) => void | Promise<void>;
  onUpdateFavoriteWorkout?: (
    id: string,
    patch: {
      name?: string;
      category?: string | null;
      exercises?: FavoriteWorkout["exercises"];
    },
  ) => void | Promise<void>;
  onSettlementSaved: (s: DailyWorkoutSettlement) => void | Promise<void>;
  onDeleteSettlement?: (s: DailyWorkoutSettlement) => void | Promise<void>;
  onVolumeGoalChange: (goalKg: number) => void | Promise<void>;
  onSettlement?: (data: {
    settlement: DailyWorkoutSettlement;
    xpGained?: number;
  }) => void;
  onRefresh?: () => void | Promise<void>;
}


export function DungeonTab({
  profile,
  workouts,
  favoriteWorkouts,
  settlementHistory,
  onAddWorkout,
  onDeleteWorkout,
  onSaveFavoriteWorkout,
  onDeleteFavoriteWorkout,
  onRenameFavoriteWorkout,
  onUpdateFavoriteWorkout,
  onSettlementSaved,
  onDeleteSettlement,
  onVolumeGoalChange,
  onSettlement,
  onRefresh,
}: DungeonTabProps) {
  const bodyWeightKg = getLatestBodyWeightKg(profile);
  const MENU_DEFAULT_SETS = 3;
  const calendarTodayKey = toDateKey();
  /** 04:00 前仍算前一天的訓練日 */
  const sessionDayKey = gymDayDateKey();
  const { dungeonBringInTab, setDungeonBringInTab } = useAppPreferences();

  const exerciseFavorites = useMemo(
    () => favoriteWorkouts.filter((f) => (f.kind ?? "exercise") !== "menu"),
    [favoriteWorkouts],
  );
  const workoutMenus = useMemo(
    () => favoriteWorkouts.filter((f) => f.kind === "menu"),
    [favoriteWorkouts],
  );

  const [prefill, setPrefill] = useState<WorkoutFormPrefill | null>(null);
  const [menuQueue, setMenuQueue] = useState<{
    name: string;
    exercises: FavoriteWorkoutExercise[];
    index: number;
  } | null>(() => {
    if (typeof window === "undefined") return null;
    const q = loadWorkoutDraft()?.menuQueue;
    if (
      !q?.name ||
      !Array.isArray(q.exercises) ||
      q.exercises.length === 0 ||
      q.index < 0 ||
      q.index >= q.exercises.length
    ) {
      return null;
    }
    return {
      name: q.name,
      exercises: q.exercises,
      index: q.index,
    };
  });
  const menuQueueRef = useRef(menuQueue);
  menuQueueRef.current = menuQueue;
  const clearPrefill = useCallback(() => setPrefill(null), []);
  const [expandedHistoryDays, setExpandedHistoryDays] = useState<Set<string>>(
    () => new Set([yesterdayDateKey()]),
  );
  /** 今日清單預設收合；有打卡後自動展開 */
  const [todayListOpen, setTodayListOpen] = useState(false);
  const prevTodayCountRef = useRef(0);
  const [settlement, setSettlement] = useState<DailyWorkoutSettlement | null>(
    null,
  );
  const [showModal, setShowModal] = useState(false);
  const [modalSettlement, setModalSettlement] =
    useState<DailyWorkoutSettlement | null>(null);
  const [coachReply, setCoachReply] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pastePreview, setPastePreview] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [gradeBrowseDateKey, setGradeBrowseDateKey] = useState(sessionDayKey);
  const [settleTargetDate, setSettleTargetDate] = useState<string | null>(
    null,
  );
  const [sheet, setSheet] = useState<null | "history" | "bring" | "settle">(
    null,
  );
  const [historyTab, setHistoryTab] = useState<"grades" | "logs">("grades");
  const fileRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLDivElement>(null);

  const defaultSettleDate = useMemo(
    () => suggestSettleDateKey(workouts, settlementHistory),
    [workouts, settlementHistory],
  );
  const effectiveSettleDate = settleTargetDate ?? defaultSettleDate;

  useEffect(() => {
    const today =
      settlementHistory.find((s) =>
        isSameDateKey(s.logDate, sessionDayKey),
      ) ?? null;
    setSettlement(today);
  }, [settlementHistory, sessionDayKey]);

  function openSettlementModal(s: DailyWorkoutSettlement, reply = "") {
    setModalSettlement(s);
    setCoachReply(reply);
    setShowModal(true);
  }

  const todayWorkouts = useMemo(
    () =>
      workouts
        .filter((w) => isSameDateKey(w.logDate, sessionDayKey))
        .sort(
          (a, b) =>
            new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
        ),
    [workouts, sessionDayKey],
  );

  const settleDateWorkouts = useMemo(
    () =>
      workouts
        .filter((w) => isSameDateKey(w.logDate, effectiveSettleDate))
        .sort(
          (a, b) =>
            new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
        ),
    [workouts, effectiveSettleDate],
  );

  const todayVolume = useMemo(
    () => calcTotalVolumeKg(todayWorkouts, bodyWeightKg),
    [todayWorkouts, bodyWeightKg],
  );

  const settleDateVolume = useMemo(
    () => calcTotalVolumeKg(settleDateWorkouts, bodyWeightKg),
    [settleDateWorkouts, bodyWeightKg],
  );

  const bodyMetrics = useMemo(
    () => buildBodyMetricsPayload(profile, todayVolume),
    [profile, todayVolume],
  );

  const settleBodyMetrics = useMemo(
    () => buildBodyMetricsPayload(profile, settleDateVolume),
    [profile, settleDateVolume],
  );

  const latestInbody = getLatestInbodyRecord(profile.inbodyHistory);

  const suggestedVolumeGoal = useMemo(
    () =>
      suggestWorkoutVolumeGoalKg(
        workouts,
        settlementHistory,
        bodyWeightKg,
      ),
    [workouts, settlementHistory, bodyWeightKg],
  );

  const volumeGoalKg = useMemo(
    () =>
      effectiveWorkoutVolumeGoalKg(
        profile.dailyWorkoutVolumeGoalKg,
        suggestedVolumeGoal,
      ),
    [profile.dailyWorkoutVolumeGoalKg, suggestedVolumeGoal],
  );

  const hasUserVolumeGoal =
    profile.dailyWorkoutVolumeGoalKg != null &&
    profile.dailyWorkoutVolumeGoalKg > 0;

  const todayExerciseGroups = useMemo(
    () => groupWorkoutsByExercise(todayWorkouts),
    [todayWorkouts],
  );
  const todayTotalSets = useMemo(
    () => countWorkoutSets(todayWorkouts),
    [todayWorkouts],
  );

  useEffect(() => {
    const count = todayWorkouts.length;
    if (prevTodayCountRef.current === 0 && count > 0) {
      setTodayListOpen(true);
    }
    prevTodayCountRef.current = count;
  }, [todayWorkouts.length]);

  const olderGradeCount = useMemo(
    () =>
      settlementHistory.filter(
        (s) =>
          !isToday(s.logDate) && s.logDate !== yesterdayDateKey(),
      ).length,
    [settlementHistory],
  );

  const historyGroups = useMemo(() => {
    const past = workouts.filter(
      (w) => !isSameDateKey(w.logDate, sessionDayKey),
    );
    return groupByDateKey(past).map((g) => ({
      ...g,
      items: g.items.sort(
        (a, b) =>
          new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
      ),
    }));
  }, [workouts, sessionDayKey]);

  function toggleHistoryDay(dateKey: string) {
    setExpandedHistoryDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }

  function historyToPrefill(w: WorkoutLog): WorkoutFormPrefill {
    const { id: _id, logDate: _d, loggedAt: _t, ...rest } = w;
    return rest;
  }

  function exerciseToPrefill(ex: FavoriteWorkoutExercise): WorkoutFormPrefill {
    const sets = Math.max(1, Math.min(20, ex.sets ?? MENU_DEFAULT_SETS));
    return {
      exerciseName: ex.exerciseName,
      loadType: ex.loadType ?? "bilateral",
      weightKg: 0,
      reps: 0,
      sets,
    };
  }

  function favoriteToPrefill(fav: FavoriteWorkout): WorkoutFormPrefill {
    const ex = fav.exercises[0];
    if (!ex) {
      return {
        exerciseName: fav.name,
        loadType: "bilateral",
        weightKg: 0,
        reps: 0,
        sets: 1,
      };
    }
    return {
      ...exerciseToPrefill(ex),
      exerciseName: ex.exerciseName || fav.name,
    };
  }

  function applyFavorite(fav: FavoriteWorkout) {
    setMenuQueue(null);
    patchWorkoutDraft({ menuQueue: null });
    setPrefill(favoriteToPrefill(fav));
    setSheet(null);
    document
      .getElementById("workout-add-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startMenuQueue(menu: FavoriteWorkout) {
    if (menu.exercises.length === 0) {
      alert("這份菜單沒有動作");
      return;
    }
    const normalized = menu.exercises.map((ex) => ({
      ...ex,
      sets: Math.max(1, Math.min(20, ex.sets ?? MENU_DEFAULT_SETS)),
    }));
    const nextQueue = {
      name: menu.name,
      exercises: normalized,
      index: 0,
    };
    setMenuQueue(nextQueue);
    patchWorkoutDraft({ menuQueue: nextQueue });
    setPrefill(exerciseToPrefill(normalized[0]));
    setSheet(null);
    document
      .getElementById("workout-add-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function advanceMenuQueue() {
    const q = menuQueueRef.current;
    if (!q) {
      patchWorkoutDraft({ menuQueue: null });
      return;
    }
    const nextIndex = q.index + 1;
    if (nextIndex >= q.exercises.length) {
      setMenuQueue(null);
      patchWorkoutDraft({ menuQueue: null });
      return;
    }
    const nextQueue = { ...q, index: nextIndex };
    setMenuQueue(nextQueue);
    patchWorkoutDraft({ menuQueue: nextQueue });
    setPrefill(exerciseToPrefill(q.exercises[nextIndex]));
  }

  function endMenuQueue() {
    setMenuQueue(null);
    patchWorkoutDraft({ menuQueue: null });
  }

  function discardRestoredSession() {
    setMenuQueue(null);
    clearWorkoutDraft();
  }

  async function handleWorkoutSave(log: Omit<WorkoutLog, "id">) {
    await onAddWorkout(log);
    advanceMenuQueue();
  }

  async function addHistoryDayAsMenu(dateKey: string, items: WorkoutLog[]) {
    if (!onSaveFavoriteWorkout) return;
    if (items.length === 0) {
      alert("這天沒有訓練紀錄可加入菜單");
      return;
    }
    const [, m, d] = dateKey.split("-");
    const short = `${Number(m)}/${Number(d)}`;
    const name = short;
    if (
      !confirm(
        `將 ${short}（${formatDateLabel(dateKey)}）的 ${items.length} 項紀錄存成菜單「${name}」？之後可重新命名。`,
      )
    ) {
      return;
    }

    const seen = new Set<string>();
    const exercises: FavoriteWorkoutExercise[] = [];
    for (const w of items) {
      const key = `${w.exerciseName}::${w.loadType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      exercises.push({
        exerciseName: w.exerciseName,
        loadType: w.loadType,
        sets: Math.max(1, w.sets || w.setDetails?.length || 1),
      });
    }

    try {
      await onSaveFavoriteWorkout({
        name,
        kind: "menu",
        exercises,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "加入菜單失敗");
    }
  }

  function openSettleSheet(dateKey?: string) {
    const next =
      dateKey ??
      settleTargetDate ??
      suggestSettleDateKey(workouts, settlementHistory);
    setSettleTargetDate(next);
    setGradeBrowseDateKey(next);
    setPastePreview(null);
    setSheet("settle");
  }

  function setBringInTab(tab: DungeonBringInTab) {
    setDungeonBringInTab(tab);
  }

  async function handleRefresh() {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  const handleRequestSettle = useCallback((dateKey: string) => {
    setSettleTargetDate(dateKey);
    setGradeBrowseDateKey(dateKey);
    setPastePreview(null);
    setSheet("settle");
  }, []);

  const submitSettlement = useCallback(
    async (file: File) => {
      const targetDate = effectiveSettleDate;
      setUploading(true);
      setPastePreview(URL.createObjectURL(file));
      try {
        const { base64, mimeType: compressedMime } =
          await fileToCompressedBase64(file);

        const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
        const res = await fetch(`${apiBase}/api/chat/workout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "綜合今日重訓清單與健身截圖進行評分",
            imageBase64: base64,
            mimeType: compressedMime,
            todayLogs: formatLogsForApi(settleDateWorkouts, bodyWeightKg),
            bodyMetrics: settleBodyMetrics,
            logDate: targetDate,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.reply ?? data.error ?? "解析失敗");

        const s = {
          ...(data.settlement as DailyWorkoutSettlement),
          logDate: targetDate,
          manualLogs:
            data.settlement.manualLogs ??
            toSettlementLogs(settleDateWorkouts, bodyWeightKg),
          totalVolumeKg:
            data.settlement.totalVolumeKg ?? settleDateVolume,
        };
        if (isSameDateKey(targetDate, sessionDayKey)) {
          setSettlement(s);
        }
        await onSettlementSaved(s);
        setSheet(null);
        openSettlementModal(s, data.reply ?? "");
        onSettlement?.({
          settlement: s,
          xpGained: data.profileUpdate?.xpGained,
        });
      } catch (e) {
        alert(e instanceof Error ? e.message : "評分失敗");
      } finally {
        setUploading(false);
      }
    },
    [
      effectiveSettleDate,
      settleDateWorkouts,
      settleDateVolume,
      sessionDayKey,
      bodyWeightKg,
      settleBodyMetrics,
      onSettlement,
      onSettlementSaved,
    ],
  );

  useEffect(() => {
    const el = pasteRef.current;
    if (!el) return;

    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file && !uploading) submitSettlement(file);
          return;
        }
      }
    }

    el.addEventListener("paste", onPaste);
    return () => el.removeEventListener("paste", onPaste);
  }, [submitSettlement, uploading]);

  const volumePct =
    volumeGoalKg > 0
      ? Math.min(100, Math.round((todayVolume / volumeGoalKg) * 100))
      : 0;

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-3 pb-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-accent-light">地下城</p>
          <p className="text-[11px] text-text-muted">
            訓練日 {formatDateLabel(sessionDayKey)}
            {sessionDayKey !== calendarTodayKey ? "（04:00 前仍算昨天）" : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="text-[11px] text-text-muted underline disabled:opacity-50"
            >
              {refreshing ? "同步中…" : "同步"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setSheet("history")}
            className="min-h-[36px] rounded-lg border border-border px-3 text-xs font-semibold text-text-muted"
          >
            歷史
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-bg-elevated px-3 py-2.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-text-muted">今日進度</span>
          <span className="tabular-nums text-accent-light">
            {Math.round(todayVolume)} / {volumeGoalKg} kg · {volumePct}%
            {settlement ? ` · ${settlement.grade}` : ""}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg-app">
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${volumePct}%` }}
          />
        </div>
      </div>

      <div id="workout-add-form">
        {menuQueue && (
          <div className="mb-3 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2">
            <p className="text-xs font-semibold text-accent-light">
              菜單「{menuQueue.name}」
            </p>
            <p className="mt-0.5 text-sm font-bold text-accent-light">
              {menuQueue.index + 1}/{menuQueue.exercises.length}{" "}
              {menuQueue.exercises[menuQueue.index]?.exerciseName}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={advanceMenuQueue}
                className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-text-muted"
              >
                跳過此動作
              </button>
              <button
                type="button"
                onClick={endMenuQueue}
                className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-text-muted"
              >
                結束菜單
              </button>
            </div>
            {menuQueue.index + 1 < menuQueue.exercises.length ? (
              <p className="mt-2 text-base font-bold leading-snug text-accent-light">
                下一動：
                {menuQueue.exercises[menuQueue.index + 1]?.exerciseName}
                {menuQueue.exercises[menuQueue.index + 1]?.sets
                  ? ` · ${menuQueue.exercises[menuQueue.index + 1]?.sets}組`
                  : ""}
              </p>
            ) : (
              <p className="mt-2 text-base font-bold text-text-muted">
                已是最後一動
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setSheet("bring")}
          className="mb-3 min-h-[44px] w-full rounded-xl border border-accent/40 bg-accent/10 text-sm font-bold text-accent-light"
        >
          帶入動作（常用／菜單）
        </button>

        <WorkoutAddForm
          profile={profile}
          workouts={workouts}
          prefill={prefill}
          onPrefillConsumed={clearPrefill}
          onSave={handleWorkoutSave}
          menuQueue={menuQueue}
          onDiscardDraft={discardRestoredSession}
        />
      </div>

      <Card>
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setTodayListOpen((o) => !o)}
        >
          <span className="card-title mb-0">
            今日清單 · {todayExerciseGroups.length} 動作 · {todayTotalSets} 組
          </span>
          <span className="text-sm text-text-muted">
            {todayListOpen ? "收起" : "展開"}
          </span>
        </button>
        {todayListOpen && (
          <div className="mt-3">
            <WorkoutVolumeGoalBar
              currentKg={todayVolume}
              goalKg={volumeGoalKg}
              suggestedKg={suggestedVolumeGoal}
              hasUserGoal={hasUserVolumeGoal}
              onGoalChange={onVolumeGoalChange}
            />
            {todayWorkouts.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-muted">
                請先登記今日動作，結算時會一併納入評分
              </p>
            ) : (
              <>
                <p className="mb-2 text-xs text-accent-light">
                  訓練量 {Math.round(todayVolume)}
                  {bodyMetrics &&
                    ` · 相對體重 ${bodyMetrics.volume_per_body_weight}（÷${bodyMetrics.weight_kg}kg）`}
                </p>
                <WorkoutGroupedList
                  workouts={todayWorkouts}
                  bodyWeightKg={bodyWeightKg}
                  onDelete={
                    onDeleteWorkout
                      ? (id) => {
                          if (
                            !confirm(
                              "確定刪除這筆訓練紀錄？此動作無法復原。",
                            )
                          ) {
                            return;
                          }
                          void onDeleteWorkout(id);
                        }
                      : undefined
                  }
                />
              </>
            )}
          </div>
        )}
      </Card>

      <button
        type="button"
        onClick={() => openSettleSheet()}
        className="mt-auto flex min-h-[52px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border-[3px] border-solid border-border-pixel bg-accent text-base font-bold text-bg-app"
      >
        今日結算
        {settlement && (
          <span
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center border-2 border-solid font-pixel text-sm",
              RANK_GRADE_BADGE[settlement.grade] ?? RANK_GRADE_BADGE.S,
            )}
          >
            {settlement.grade}
          </span>
        )}
      </button>

      <FullScreenSheet
        open={sheet === "history"}
        title="歷史"
        onClose={() => setSheet(null)}
      >
        <div className="mb-3 flex gap-1.5">
          {(
            [
              ["grades", `評分${olderGradeCount > 0 ? ` (${olderGradeCount})` : ""}`],
              ["logs", `訓練清單 (${historyGroups.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setHistoryTab(id)}
              className={cn(
                "min-h-[36px] flex-1 rounded-lg border text-xs font-semibold",
                historyTab === id
                  ? "border-accent bg-accent/20 text-accent-light"
                  : "border-border bg-bg-elevated text-text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {historyTab === "grades" ? (
          <WorkoutGradeHistory
            settlements={settlementHistory}
            workouts={workouts}
            browseDateKey={gradeBrowseDateKey}
            onBrowseDateChange={setGradeBrowseDateKey}
            onSelect={(s) => {
              setSheet(null);
              openSettlementModal(s);
            }}
            onDelete={onDeleteSettlement}
            onRequestSettle={handleRequestSettle}
            settlePending={uploading}
          />
        ) : (
          <div className="space-y-4">
            {historyGroups.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-muted">
                尚無過往紀錄
              </p>
            ) : (
              historyGroups.map((group) => {
                const dayVolume = Math.round(
                  calcTotalVolumeKg(group.items, bodyWeightKg),
                );
                const expanded = expandedHistoryDays.has(group.dateKey);
                return (
                  <div key={group.dateKey}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleHistoryDay(group.dateKey)}
                        className="flex min-w-0 flex-1 items-center justify-between rounded-lg border border-border bg-bg-elevated px-3 py-2 text-left text-xs font-semibold text-accent active:scale-[0.99]"
                      >
                        <span>
                          {expanded ? "▼" : "▶"}{" "}
                          {formatDateLabel(group.dateKey)}
                          <span className="ml-2 font-normal text-text-muted">
                            {group.dateKey}
                          </span>
                        </span>
                        <span className="tabular-nums text-text-muted">
                          {group.items.length} 項 · {dayVolume}
                        </span>
                      </button>
                      {onSaveFavoriteWorkout && (
                        <button
                          type="button"
                          onClick={() =>
                            void addHistoryDayAsMenu(
                              group.dateKey,
                              group.items,
                            )
                          }
                          className="shrink-0 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-2 text-[11px] font-semibold text-accent-light"
                        >
                          加入菜單
                        </button>
                      )}
                    </div>
                    {expanded && (
                      <div className="mt-1 px-1">
                        <WorkoutGroupedList
                          workouts={group.items}
                          bodyWeightKg={bodyWeightKg}
                          onSelectLog={(w) => {
                            setPrefill(historyToPrefill(w));
                            setSheet(null);
                          }}
                          onDelete={
                            onDeleteWorkout
                              ? (id) => {
                                  if (
                                    !confirm(
                                      "確定刪除這筆訓練紀錄？此動作無法復原。",
                                    )
                                  ) {
                                    return;
                                  }
                                  void onDeleteWorkout(id);
                                }
                              : undefined
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <p className="text-center text-xs text-text-muted">
              點選歷史紀錄可帶入表單，儲存後會新增一筆
            </p>
          </div>
        )}
      </FullScreenSheet>

      <FullScreenSheet
        open={sheet === "bring"}
        title="帶入動作"
        onClose={() => setSheet(null)}
      >
        <div className="mb-3 flex gap-1.5">
          {(
            [
              ["menus", "菜單"],
              ["favorites", "常用"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setBringInTab(id)}
              className={cn(
                "min-h-[36px] flex-1 rounded-lg border text-xs font-semibold",
                dungeonBringInTab === id
                  ? "border-accent bg-accent/20 text-accent-light"
                  : "border-border bg-bg-elevated text-text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {dungeonBringInTab === "menus" ? (
          onDeleteFavoriteWorkout ? (
            <WorkoutMenusPanel
              menus={workoutMenus}
              exerciseFavorites={exerciseFavorites}
              onApplyMenu={startMenuQueue}
              onDelete={onDeleteFavoriteWorkout}
              onRename={onRenameFavoriteWorkout}
              onUpdate={onUpdateFavoriteWorkout}
              onCreate={onSaveFavoriteWorkout}
              embedded
            />
          ) : (
            <p className="py-6 text-center text-sm text-text-muted">尚無菜單</p>
          )
        ) : onDeleteFavoriteWorkout ? (
          <FavoriteWorkoutsPanel
            favorites={exerciseFavorites}
            onApply={applyFavorite}
            onDelete={onDeleteFavoriteWorkout}
            onCreate={onSaveFavoriteWorkout}
            onUpdate={onUpdateFavoriteWorkout}
            embedded
          />
        ) : (
          <p className="py-6 text-center text-sm text-text-muted">尚無常用動作</p>
        )}
      </FullScreenSheet>

      <FullScreenSheet
        open={sheet === "settle"}
        title="今日結算"
        onClose={() => setSheet(null)}
      >
        <div className="mb-3 rounded-xl border border-border bg-bg-elevated p-3">
          <p className="text-xs font-semibold text-text-muted">結算日</p>
          <p className="mt-1 text-sm font-bold text-accent-light">
            {formatDateLabel(effectiveSettleDate)}（{effectiveSettleDate}）
          </p>
          <p className="mt-1 text-[11px] text-text-muted">
            凌晨 04:00 前預設算前一天訓練日；可手動切換。
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSettleTargetDate(sessionDayKey)}
              className={cn(
                "min-h-[36px] rounded-lg border px-3 text-xs font-semibold",
                isSameDateKey(effectiveSettleDate, sessionDayKey)
                  ? "border-accent bg-accent/20 text-accent-light"
                  : "border-border text-text-muted",
              )}
            >
              訓練日
            </button>
            <button
              type="button"
              onClick={() => setSettleTargetDate(calendarTodayKey)}
              className={cn(
                "min-h-[36px] rounded-lg border px-3 text-xs font-semibold",
                isSameDateKey(effectiveSettleDate, calendarTodayKey)
                  ? "border-accent bg-accent/20 text-accent-light"
                  : "border-border text-text-muted",
              )}
            >
              日曆今天
            </button>
            <button
              type="button"
              onClick={() => setSettleTargetDate(yesterdayDateKey())}
              className={cn(
                "min-h-[36px] rounded-lg border px-3 text-xs font-semibold",
                isSameDateKey(effectiveSettleDate, yesterdayDateKey())
                  ? "border-accent bg-accent/20 text-accent-light"
                  : "border-border text-text-muted",
              )}
            >
              昨天
            </button>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            清單 {settleDateWorkouts.length} 筆 · 訓練量{" "}
            {Math.round(settleDateVolume)} kg
            {latestInbody?.weight_kg
              ? ` · 依體重 ${latestInbody.weight_kg}kg`
              : ""}
          </p>
        </div>

        <div
          ref={pasteRef}
          tabIndex={0}
          className="h-0 overflow-hidden outline-none"
          aria-hidden
        />

        {pastePreview && (
          <img
            src={pastePreview}
            alt="已貼上的截圖"
            className="mx-auto mb-3 max-h-36 object-contain"
          />
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void submitSettlement(f);
            e.target.value = "";
          }}
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="min-h-[48px] rounded-xl border border-border bg-bg-elevated text-sm font-semibold disabled:opacity-50"
          >
            從相簿選擇
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => pasteRef.current?.focus()}
            className="min-h-[48px] rounded-xl bg-accent text-sm font-bold text-bg-app disabled:opacity-40"
          >
            {uploading ? "評分中…" : "開始貼上評分"}
          </button>
        </div>

        {settleDateWorkouts.length === 0 && (
          <p className="mt-3 text-center text-xs text-text-muted">
            此日尚無重訓清單，僅截圖也可評分
          </p>
        )}

        {settlement &&
          isSameDateKey(settlement.logDate, effectiveSettleDate) && (
            <button
              type="button"
              onClick={() => {
                setSheet(null);
                openSettlementModal(settlement);
              }}
              className="mt-3 w-full text-center text-sm text-accent-light underline"
            >
              再看一次此日結算
            </button>
          )}
      </FullScreenSheet>

      {showModal && modalSettlement && (
        <WorkoutSettlementModal
          data={modalSettlement}
          coachReply={coachReply}
          onClose={() => {
            setShowModal(false);
            setModalSettlement(null);
          }}
        />
      )}
    </div>
  );
}
