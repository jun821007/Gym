"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FavoriteWorkoutsPanel } from "@/components/dashboard/FavoriteWorkoutsPanel";
import {
  WorkoutAddForm,
  type WorkoutFormPrefill,
} from "@/components/dashboard/WorkoutAddForm";
import { WorkoutGradeHistory } from "@/components/dashboard/WorkoutGradeHistory";
import { WorkoutSettlementModal } from "@/components/dashboard/WorkoutSettlementModal";
import { Card } from "@/components/ui/Card";
import {
  formatDateLabel,
  formatTime,
  groupByDateKey,
  isToday,
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
  UserProfile,
  WorkoutLog,
} from "@/lib/types";
import {
  formatWorkoutSummary,
  getLatestBodyWeightKg,
  normalizeSetDetails,
} from "@/lib/workout-volume";
import { cn } from "@/lib/utils";

interface DungeonTabProps {
  profile: UserProfile;
  workouts: WorkoutLog[];
  favoriteWorkouts: FavoriteWorkout[];
  settlementHistory: DailyWorkoutSettlement[];
  onAddWorkout: (log: Omit<WorkoutLog, "id">) => void | Promise<void>;
  onDeleteWorkout?: (id: string) => void | Promise<void>;
  onSaveFavoriteWorkout?: (fav: {
    name: string;
    exercises: FavoriteWorkout["exercises"];
  }) => void | Promise<void>;
  onDeleteFavoriteWorkout?: (id: string) => void | Promise<void>;
  onSettlementSaved: (s: DailyWorkoutSettlement) => void | Promise<void>;
  onSettlement?: (data: {
    settlement: DailyWorkoutSettlement;
    xpGained?: number;
  }) => void;
}

const GRADE_BADGE: Record<DailyWorkoutSettlement["grade"], string> = {
  S: "bg-accent/30 text-accent-light border-accent-light",
  A: "bg-accent/20 text-accent border-accent",
  B: "bg-sky-500/20 text-sky-300 border-sky-400",
  C: "bg-bg-elevated text-text-muted border-border",
  D: "bg-danger/15 text-danger border-danger",
};

function WorkoutRow({
  w,
  bodyWeightKg,
  onSelect,
  onDelete,
}: {
  w: WorkoutLog;
  bodyWeightKg: number | null;
  onSelect?: () => void;
  onDelete?: () => void;
}) {
  const sets = normalizeSetDetails(w);
  const repSummary = sets
    .map((s) => s.reps)
    .join("/");

  return (
    <li className="flex items-start justify-between gap-2 py-2.5 text-sm">
      <button
        type="button"
        onClick={onSelect}
        disabled={!onSelect}
        className={cn(
          "min-w-0 flex-1 text-left",
          onSelect && "active:opacity-70",
        )}
      >
        <span className="font-medium">{w.exerciseName}</span>
        <time
          className="ml-2 text-xs tabular-nums text-text-muted"
          dateTime={w.loggedAt}
        >
          {formatTime(w.loggedAt)}
        </time>
        <p className="mt-0.5 text-xs text-text-muted">
          {formatWorkoutSummary(w, bodyWeightKg)} · {repSummary}次
        </p>
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-text-muted"
        >
          刪除
        </button>
      )}
    </li>
  );
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
  onSettlementSaved,
  onSettlement,
}: DungeonTabProps) {
  const bodyWeightKg = getLatestBodyWeightKg(profile);
  const [prefill, setPrefill] = useState<WorkoutFormPrefill | null>(null);
  const [exerciseNamePrefill, setExerciseNamePrefill] = useState<string | null>(
    null,
  );
  const [logsHistoryOpen, setLogsHistoryOpen] = useState(true);
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
  const fileRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const today =
      settlementHistory.find((s) => isToday(s.logDate)) ?? null;
    setSettlement(today);
  }, [settlementHistory]);

  function openSettlementModal(s: DailyWorkoutSettlement, reply = "") {
    setModalSettlement(s);
    setCoachReply(reply);
    setShowModal(true);
  }

  const todayWorkouts = useMemo(
    () =>
      workouts
        .filter((w) => isToday(w.loggedAt))
        .sort(
          (a, b) =>
            new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
        ),
    [workouts],
  );

  const todayVolume = useMemo(
    () => calcTotalVolumeKg(todayWorkouts, bodyWeightKg),
    [todayWorkouts, bodyWeightKg],
  );

  const bodyMetrics = useMemo(
    () => buildBodyMetricsPayload(profile, todayVolume),
    [profile, todayVolume],
  );

  const latestInbody = profile.inbodyHistory.at(-1);

  const historyGroups = useMemo(() => {
    const past = workouts.filter((w) => !isToday(w.loggedAt));
    return groupByDateKey(past).map((g) => ({
      ...g,
      items: g.items.sort(
        (a, b) =>
          new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
      ),
    }));
  }, [workouts]);

  function historyToPrefill(w: WorkoutLog): WorkoutFormPrefill {
    const { id: _id, logDate: _d, loggedAt: _t, ...rest } = w;
    return rest;
  }

  function applyFavoriteName(name: string) {
    setExerciseNamePrefill(name);
    document
      .getElementById("workout-add-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const submitSettlement = useCallback(
    async (file: File) => {
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
            todayLogs: formatLogsForApi(todayWorkouts, bodyWeightKg),
            bodyMetrics,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.reply ?? data.error ?? "解析失敗");

        const s = {
          ...(data.settlement as DailyWorkoutSettlement),
          manualLogs:
            data.settlement.manualLogs ??
            toSettlementLogs(todayWorkouts, bodyWeightKg),
          totalVolumeKg:
            data.settlement.totalVolumeKg ?? todayVolume,
        };
        setSettlement(s);
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
      todayWorkouts,
      todayVolume,
      bodyWeightKg,
      bodyMetrics,
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
      {favoriteWorkouts.length > 0 && onDeleteFavoriteWorkout && (
        <FavoriteWorkoutsPanel
          favorites={favoriteWorkouts}
          onApplyName={applyFavoriteName}
          onDelete={onDeleteFavoriteWorkout}
        />
      )}

      <div id="workout-add-form">
        <WorkoutAddForm
          profile={profile}
          prefill={prefill}
          exerciseNamePrefill={exerciseNamePrefill}
          onPrefillConsumed={() => setPrefill(null)}
          onExerciseNamePrefillConsumed={() => setExerciseNamePrefill(null)}
          onSave={onAddWorkout}
          onSaveFavorite={onSaveFavoriteWorkout}
        />
      </div>

      <Card title={`今日清單 · ${todayWorkouts.length} 項`}>
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
            <ul className="divide-y divide-border">
              {todayWorkouts.map((w) => (
                <WorkoutRow
                  key={w.id}
                  w={w}
                  bodyWeightKg={bodyWeightKg}
                  onDelete={
                    onDeleteWorkout
                      ? () => void onDeleteWorkout(w.id)
                      : undefined
                  }
                />
              ))}
            </ul>
          </>
        )}
      </Card>

      <div className="pixel-card pixel-card--hero">
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
          </div>
          {settlement && (
            <span
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center border-[4px] border-solid font-pixel text-3xl",
                GRADE_BADGE[settlement.grade],
              )}
            >
              {settlement.grade}
            </span>
          )}
        </div>

        <div
          ref={pasteRef}
          tabIndex={0}
          role="button"
          onClick={() => pasteRef.current?.focus()}
          className={cn(
            "mt-4 min-h-[120px] border-[3px] border-dashed border-border-pixel bg-bg-app p-4 outline-none transition",
            "focus:border-accent focus:bg-accent-soft",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          {pastePreview ? (
            <img
              src={pastePreview}
              alt="已貼上的截圖"
              className="mx-auto max-h-28 object-contain"
            />
          ) : (
            <div className="flex h-full min-h-[88px] flex-col items-center justify-center text-center">
              <span className="text-2xl">📋</span>
              <p className="mt-2 text-sm font-medium text-text">
                點此區域後直接貼上圖片
              </p>
              <p className="mt-1 text-xs text-text-muted">
                長按貼上 / Ctrl+V（電腦）
              </p>
            </div>
          )}
        </div>

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

        {todayWorkouts.length === 0 && (
          <p className="mt-2 text-center text-xs text-text-muted">
            建議先填今日清單，評分會更準；僅截圖也可評分
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
            {settlementHistory.filter((s) => !isToday(s.logDate)).length > 0 && (
              <span className="ml-2 font-normal text-text-muted">
                ({settlementHistory.filter((s) => !isToday(s.logDate)).length})
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
              onSelect={(s) => openSettlementModal(s)}
            />
          </div>
        )}
      </Card>

      <Card>
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setLogsHistoryOpen((o) => !o)}
        >
          <span className="card-title mb-0">歷史訓練清單</span>
          <span className="text-sm text-text-muted">
            {logsHistoryOpen ? "收起" : "展開"}
          </span>
        </button>
        {logsHistoryOpen && (
          <div className="mt-3 space-y-4">
            {historyGroups.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-muted">
                尚無過往紀錄
              </p>
            ) : (
              historyGroups.map((group) => (
                <div key={group.dateKey}>
                  <p className="mb-1 text-xs font-semibold text-accent">
                    {formatDateLabel(group.dateKey)}
                  </p>
                  <ul className="divide-y divide-border rounded-xl bg-bg-elevated px-3">
                    {group.items.map((w) => (
                      <WorkoutRow
                        key={w.id}
                        w={w}
                        bodyWeightKg={bodyWeightKg}
                        onSelect={() => setPrefill(historyToPrefill(w))}
                      />
                    ))}
                  </ul>
                </div>
              ))
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
