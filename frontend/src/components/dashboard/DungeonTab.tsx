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
import {
  formatDateLabel,
  groupByDateKey,
  isSameDateKey,
  isToday,
  toDateKey,
  yesterdayDateKey,
} from "@/lib/datetime";
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
import { getLatestBodyWeightKg } from "@/lib/workout-volume";
import {
  effectiveWorkoutVolumeGoalKg,
  suggestWorkoutVolumeGoalKg,
} from "@/lib/workout-volume-goal";
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
  const todayKey = toDateKey();

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
  } | null>(null);
  const menuQueueRef = useRef(menuQueue);
  menuQueueRef.current = menuQueue;
  const clearPrefill = useCallback(() => setPrefill(null), []);
  const [logsHistoryOpen, setLogsHistoryOpen] = useState(false);
  const [expandedHistoryDays, setExpandedHistoryDays] = useState<Set<string>>(
    () => new Set(),
  );
  const [gradesHistoryOpen, setGradesHistoryOpen] = useState(true);
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
  const [gradeBrowseDateKey, setGradeBrowseDateKey] = useState(todayKey);
  const [settleTargetDate, setSettleTargetDate] = useState<string | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLDivElement>(null);
  const pasteSectionRef = useRef<HTMLDivElement>(null);

  const effectiveSettleDate = settleTargetDate ?? todayKey;

  useEffect(() => {
    const today =
      settlementHistory.find((s) => isSameDateKey(s.logDate, todayKey)) ??
      null;
    setSettlement(today);
  }, [settlementHistory, todayKey]);

  function openSettlementModal(s: DailyWorkoutSettlement, reply = "") {
    setModalSettlement(s);
    setCoachReply(reply);
    setShowModal(true);
  }

  const todayWorkouts = useMemo(
    () =>
      workouts
        .filter((w) => isSameDateKey(w.logDate, todayKey))
        .sort(
          (a, b) =>
            new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
        ),
    [workouts, todayKey],
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

  const latestInbody = profile.inbodyHistory.at(-1);

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

  const olderGradeCount = useMemo(
    () =>
      settlementHistory.filter(
        (s) =>
          !isToday(s.logDate) && s.logDate !== yesterdayDateKey(),
      ).length,
    [settlementHistory],
  );

  const historyGroups = useMemo(() => {
    const past = workouts.filter((w) => !isSameDateKey(w.logDate, todayKey));
    return groupByDateKey(past).map((g) => ({
      ...g,
      items: g.items.sort(
        (a, b) =>
          new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
      ),
    }));
  }, [workouts, todayKey]);

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
    return {
      exerciseName: ex.exerciseName,
      loadType: ex.loadType ?? "bilateral",
      weightKg: 0,
      reps: 0,
      sets: 1,
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
    setPrefill(favoriteToPrefill(fav));
    document
      .getElementById("workout-add-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startMenuQueue(menu: FavoriteWorkout) {
    if (menu.exercises.length === 0) {
      alert("這份菜單沒有動作");
      return;
    }
    setMenuQueue({
      name: menu.name,
      exercises: menu.exercises,
      index: 0,
    });
    setPrefill(exerciseToPrefill(menu.exercises[0]));
    document
      .getElementById("workout-add-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function advanceMenuQueue() {
    const q = menuQueueRef.current;
    if (!q) return;
    const nextIndex = q.index + 1;
    if (nextIndex >= q.exercises.length) {
      setMenuQueue(null);
      return;
    }
    setMenuQueue({ ...q, index: nextIndex });
    setPrefill(exerciseToPrefill(q.exercises[nextIndex]));
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

  function toggleLogsHistory() {
    setLogsHistoryOpen((open) => {
      const next = !open;
      if (next) {
        setExpandedHistoryDays((prev) => {
          const expanded = new Set(prev);
          expanded.add(yesterdayDateKey());
          return expanded;
        });
      }
      return next;
    });
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
    pasteSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    window.setTimeout(() => pasteRef.current?.focus(), 300);
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
        if (isSameDateKey(targetDate, todayKey)) {
          setSettlement(s);
        }
        if (settleTargetDate) setSettleTargetDate(null);
        await onSettlementSaved(s);
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
      todayKey,
      bodyWeightKg,
      settleBodyMetrics,
      settleTargetDate,
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

  return (
    <div className="space-y-4 pb-2">
      <div className="flex justify-end">
        {onRefresh && (
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="text-xs text-text-muted underline disabled:opacity-50"
          >
            {refreshing ? "同步中…" : "重新同步訓練紀錄"}
          </button>
        )}
      </div>
      {(exerciseFavorites.length > 0 || onSaveFavoriteWorkout) &&
        onDeleteFavoriteWorkout && (
        <FavoriteWorkoutsPanel
          favorites={exerciseFavorites}
          onApply={applyFavorite}
          onDelete={onDeleteFavoriteWorkout}
          onCreate={onSaveFavoriteWorkout}
          onUpdate={onUpdateFavoriteWorkout}
        />
      )}

      {workoutMenus.length > 0 && onDeleteFavoriteWorkout && (
        <WorkoutMenusPanel
          menus={workoutMenus}
          onApplyMenu={startMenuQueue}
          onDelete={onDeleteFavoriteWorkout}
          onRename={onRenameFavoriteWorkout}
        />
      )}

      <div id="workout-add-form">
        {menuQueue && (
          <div className="mb-3 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2">
            <p className="text-xs font-semibold text-accent-light">
              菜單「{menuQueue.name}」{menuQueue.index + 1}/
              {menuQueue.exercises.length}：
              {menuQueue.exercises[menuQueue.index]?.exerciseName}
            </p>
            <p className="mt-0.5 text-[11px] text-text-muted">
              打卡後自動帶入下一動作；次數／重量請自行填。
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={advanceMenuQueue}
                className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-text-muted"
              >
                跳過此動作
              </button>
              <button
                type="button"
                onClick={() => setMenuQueue(null)}
                className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-text-muted"
              >
                結束菜單
              </button>
            </div>
          </div>
        )}
        <WorkoutAddForm
          profile={profile}
          workouts={workouts}
          prefill={prefill}
          onPrefillConsumed={clearPrefill}
          onSave={handleWorkoutSave}
        />
      </div>

      <Card
        title={`今日清單 · ${todayExerciseGroups.length} 動作 · ${todayTotalSets} 組`}
      >
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
      </Card>

      <div ref={pasteSectionRef} className="pixel-card pixel-card--hero">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-pixel-sm font-bold text-accent-light">
              ▶ 貼上截圖結算
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {latestInbody?.weight_kg
                ? `依體重 ${latestInbody.weight_kg}kg、清單、截圖綜合評分`
                : "請先在體態頁記錄體重，評分更準"}
            </p>
            {settleTargetDate && !isSameDateKey(settleTargetDate, todayKey) && (
              <p className="mt-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent-light">
                補登 {formatDateLabel(settleTargetDate)}（{settleTargetDate}）
                <button
                  type="button"
                  onClick={() => setSettleTargetDate(null)}
                  className="ml-2 underline"
                >
                  改回今日
                </button>
              </p>
            )}
          </div>
          {settlement && (
            <span
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center border-[4px] border-solid font-pixel text-3xl",
                RANK_GRADE_BADGE[settlement.grade] ?? RANK_GRADE_BADGE.S,
              )}
            >
              {settlement.grade}
            </span>
          )}
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
            className="mx-auto mt-3 max-h-28 object-contain"
          />
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) submitSettlement(f);
            e.target.value = "";
          }}
        />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="min-h-[48px] border-[3px] border-solid border-border-pixel bg-bg-elevated text-sm font-semibold text-text disabled:opacity-50"
          >
            從相簿選擇
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => pasteRef.current?.focus()}
            className="min-h-[48px] border-[3px] border-solid border-border-pixel bg-accent text-sm font-bold text-bg-app disabled:opacity-40"
          >
            {uploading ? "評分中…" : "開始貼上評分"}
          </button>
        </div>

        {settleDateWorkouts.length === 0 && (
          <p className="mt-2 text-center text-xs text-text-muted">
            {isSameDateKey(effectiveSettleDate, todayKey)
              ? "建議先填今日清單，評分會更準；僅截圖也可評分"
              : `${formatDateLabel(effectiveSettleDate)} 尚無重訓清單，僅截圖也可評分`}
          </p>
        )}

        {settlement && !showModal && (
          <button
            type="button"
            onClick={() => settlement && openSettlementModal(settlement)}
            className="mt-3 w-full text-center text-sm text-accent-light underline"
          >
            再看一次今日結算
          </button>
        )}
      </div>

      <Card>
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setGradesHistoryOpen((o) => !o)}
        >
          <span className="card-title mb-0">
            歷史評分
            {olderGradeCount > 0 && (
              <span className="ml-2 font-normal text-text-muted">
                ({olderGradeCount})
              </span>
            )}
          </span>
          <span className="text-sm text-text-muted">
            {gradesHistoryOpen ? "收起" : "展開"}
          </span>
        </button>
        {gradesHistoryOpen && (
          <div className="mt-3">
            <WorkoutGradeHistory
              settlements={settlementHistory}
              workouts={workouts}
              browseDateKey={gradeBrowseDateKey}
              onBrowseDateChange={setGradeBrowseDateKey}
              onSelect={(s) => openSettlementModal(s)}
              onDelete={onDeleteSettlement}
              onRequestSettle={handleRequestSettle}
              settlePending={uploading}
            />
          </div>
        )}
      </Card>

      <Card>
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={toggleLogsHistory}
        >
          <span className="card-title mb-0">歷史訓練清單</span>
          <span className="text-sm text-text-muted">
            {logsHistoryOpen
              ? "收起"
              : `展開 · ${historyGroups.length} 天`}
          </span>
        </button>
        {logsHistoryOpen && (
          <div className="mt-3 space-y-4">
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
                          onSelectLog={(w) => setPrefill(historyToPrefill(w))}
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
      </Card>

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
