"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { DateShiftHeader } from "@/components/ui/DateShiftHeader";
import { toDateKey } from "@/lib/datetime";
import {
  formatExerciseSetStat,
  getExerciseHistoryStats,
} from "@/lib/exercise-history-stats";
import { combineDateAndTime, nowTimeStr } from "@/lib/logged-at";
import type {
  UserProfile,
  WorkoutLoadType,
  WorkoutLog,
  WorkoutSetDetail,
} from "@/lib/types";
import {
  draftHasFormContent,
  draftSetRowsToDetails,
  loadWorkoutDraft,
  patchWorkoutDraft,
  type WorkoutDraftSetRow,
  type WorkoutMenuQueueDraft,
} from "@/lib/workout-draft";
import {
  BODYWEIGHT_FACTOR,
  LOAD_TYPE_OPTIONS,
  getLatestBodyWeightKg,
  parseWeightKgInput,
} from "@/lib/workout-volume";

type SetRow = WorkoutDraftSetRow;

const emptySet = (): SetRow => ({
  reps: "",
  weightKg: "",
  strap: false,
  belt: false,
  knee: false,
  wrist: false,
});

function setRowFromDetail(s: WorkoutSetDetail, defaultWeight: string): SetRow {
  return {
    reps: s.reps > 0 ? String(s.reps) : "",
    weightKg:
      s.weightKg != null && s.weightKg > 0
        ? String(s.weightKg)
        : defaultWeight,
    strap: s.gear?.includes("strap") ?? false,
    belt: s.gear?.includes("belt") ?? false,
    knee: s.gear?.includes("knee") ?? false,
    wrist: s.gear?.includes("wrist") ?? false,
  };
}

function buildGear(row: SetRow): WorkoutSetDetail["gear"] {
  const g: NonNullable<WorkoutSetDetail["gear"]> = [];
  if (row.strap) g.push("strap");
  if (row.belt) g.push("belt");
  if (row.knee) g.push("knee");
  if (row.wrist) g.push("wrist");
  return g.length ? g : undefined;
}

function loadTypeLabel(loadType: WorkoutLoadType): string {
  return LOAD_TYPE_OPTIONS.find((o) => o.value === loadType)?.label ?? loadType;
}

export type WorkoutFormPrefill = Omit<WorkoutLog, "id" | "logDate" | "loggedAt">;

export interface WorkoutAddFormProps {
  profile: UserProfile;
  workouts?: WorkoutLog[];
  prefill?: WorkoutFormPrefill | null;
  onPrefillConsumed?: () => void;
  onSave: (log: Omit<WorkoutLog, "id">) => void | Promise<void>;
  /** 目前菜單進度，寫進同一份草稿 */
  menuQueue?: WorkoutMenuQueueDraft | null;
  /** 草稿還原成功後回呼（顯示提示） */
  onDraftRestored?: (info: { exerciseName: string; menuName?: string }) => void;
  /** 放棄草稿（清表單）時通知父層清菜單進度 */
  onDiscardDraft?: () => void;
}

export function WorkoutAddForm({
  profile,
  workouts = [],
  prefill,
  onPrefillConsumed,
  onSave,
  menuQueue = null,
  onDraftRestored,
  onDiscardDraft,
}: WorkoutAddFormProps) {
  const bodyWeightKg = getLatestBodyWeightKg(profile);
  const effectiveBw =
    bodyWeightKg != null
      ? Math.round(bodyWeightKg * BODYWEIGHT_FACTOR * 10) / 10
      : null;

  const [exerciseName, setExerciseName] = useState("");
  const [loadType, setLoadType] = useState<WorkoutLoadType>("bilateral");
  const [weightKg, setWeightKg] = useState("");
  const [extraWeightKg, setExtraWeightKg] = useState("");
  const [assistKg, setAssistKg] = useState("");
  const [setRows, setSetRows] = useState<SetRow[]>([emptySet()]);
  const [dateKey, setDateKey] = useState(toDateKey);
  const [saving, setSaving] = useState(false);
  const [restoredBanner, setRestoredBanner] = useState(false);

  const restoredRef = useRef(false);
  const skipDraftSaveRef = useRef(false);

  const hasPreset = exerciseName.trim().length > 0;

  const exerciseStats = useMemo(
    () => getExerciseHistoryStats(workouts, exerciseName, bodyWeightKg),
    [workouts, exerciseName, bodyWeightKg],
  );

  // 掛載時自動還原草稿（僅一次；若同時有 prefill 則讓 prefill 優先）
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (prefill) return;

    const draft = loadWorkoutDraft();
    if (!draft || !draftHasFormContent(draft)) return;

    skipDraftSaveRef.current = true;
    setExerciseName(draft.exerciseName);
    setLoadType(draft.loadType);
    setWeightKg(draft.weightKg);
    setExtraWeightKg(draft.extraWeightKg);
    setAssistKg(draft.assistKg);
    setDateKey(draft.dateKey || toDateKey());
    setSetRows(
      draft.setRows.length > 0 ? draft.setRows.map((r) => ({ ...r })) : [emptySet()],
    );
    setRestoredBanner(true);
    onDraftRestored?.({
      exerciseName: draft.exerciseName,
      menuName: draft.menuQueue?.name,
    });
    queueMicrotask(() => {
      skipDraftSaveRef.current = false;
    });
  }, [prefill, onDraftRestored]);

  useEffect(() => {
    if (!prefill) return;
    skipDraftSaveRef.current = true;
    setExerciseName(prefill.exerciseName);
    setLoadType(prefill.loadType);
    setWeightKg(prefill.weightKg ? String(prefill.weightKg) : "");
    setExtraWeightKg(
      prefill.extraWeightKg != null ? String(prefill.extraWeightKg) : "",
    );
    setAssistKg(prefill.assistKg != null ? String(prefill.assistKg) : "");
    const defaultExtra =
      prefill.setDetails?.[0]?.weightKg != null
        ? String(prefill.setDetails[0].weightKg)
        : prefill.extraWeightKg != null
          ? String(prefill.extraWeightKg)
          : "";
    const defaultBar =
      prefill.loadType === "bilateral" || prefill.loadType === "unilateral"
        ? prefill.weightKg
          ? String(prefill.weightKg)
          : ""
        : "";
    if (prefill.setDetails?.length) {
      setSetRows(
        prefill.setDetails.map((s) =>
          setRowFromDetail(
            s,
            prefill.loadType === "weighted_bw" ? defaultExtra : defaultBar,
          ),
        ),
      );
    } else {
      setSetRows(
        Array.from({ length: Math.max(1, prefill.sets) }, () => ({
          reps: prefill.reps > 0 ? String(prefill.reps) : "",
          weightKg:
            prefill.loadType === "weighted_bw" ? defaultExtra : defaultBar,
          strap: false,
          belt: false,
          knee: false,
          wrist: false,
        })),
      );
    }
    setRestoredBanner(false);
    onPrefillConsumed?.();
    queueMicrotask(() => {
      skipDraftSaveRef.current = false;
    });
  }, [prefill, onPrefillConsumed]);

  // 表單內容變更 → 自動寫入草稿（不覆寫 menuQueue，由下方獨立同步）
  useEffect(() => {
    if (skipDraftSaveRef.current) return;
    const timer = window.setTimeout(() => {
      patchWorkoutDraft({
        dateKey,
        exerciseName,
        loadType,
        weightKg,
        extraWeightKg,
        assistKg,
        setRows,
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    dateKey,
    exerciseName,
    loadType,
    weightKg,
    extraWeightKg,
    assistKg,
    setRows,
  ]);

  // 菜單進度變更 → 同步進同一份草稿
  useEffect(() => {
    patchWorkoutDraft({ menuQueue });
  }, [menuQueue]);

  function needsSetWeightInput(type: WorkoutLoadType) {
    return (
      type === "bilateral" ||
      type === "unilateral" ||
      type === "weighted_bw"
    );
  }

  function requiresPositiveSetWeight(type: WorkoutLoadType) {
    return type === "bilateral" || type === "unilateral";
  }

  function copySetFields(from: SetRow, to: SetRow): SetRow {
    return {
      ...to,
      weightKg: from.weightKg,
      strap: from.strap,
      belt: from.belt,
      knee: from.knee,
      wrist: from.wrist,
    };
  }

  function copyToNextSet(index: number) {
    setSetRows((rows) => {
      if (index < 0 || index >= rows.length - 1) return rows;
      const current = rows[index];
      return rows.map((r, i) =>
        i === index + 1 ? copySetFields(current, r) : r,
      );
    });
  }

  function copyToRemainingSets(index: number) {
    setSetRows((rows) => {
      if (index < 0 || index >= rows.length - 1) return rows;
      const current = rows[index];
      return rows.map((r, i) =>
        i > index ? copySetFields(current, r) : r,
      );
    });
  }

  function normalizeRepsInput(value: string): string {
    return value.replace(/[^\d]/g, "");
  }

  function resetFormFields() {
    skipDraftSaveRef.current = true;
    setExerciseName("");
    setLoadType("bilateral");
    setWeightKg("");
    setExtraWeightKg("");
    setAssistKg("");
    setSetRows([emptySet()]);
    setRestoredBanner(false);
    queueMicrotask(() => {
      skipDraftSaveRef.current = false;
    });
  }

  function discardDraft() {
    resetFormFields();
    patchWorkoutDraft({
      exerciseName: "",
      weightKg: "",
      extraWeightKg: "",
      assistKg: "",
      setRows: [emptySet()],
      menuQueue: null,
    });
    onDiscardDraft?.();
  }

  function buildLog(): Omit<WorkoutLog, "id"> | null {
    if (!exerciseName.trim()) {
      alert("請先從常用訓練或訓練菜單帶入動作");
      return null;
    }
    const details: WorkoutSetDetail[] = [];
    for (let i = 0; i < setRows.length; i++) {
      const row = setRows[i];
      const reps = Number(row.reps);
      if (!Number.isFinite(reps) || reps <= 0) {
        alert(`第 ${i + 1} 組請輸入次數`);
        return null;
      }
      const setWeight = needsSetWeightInput(loadType)
        ? parseWeightKgInput(row.weightKg || weightKg)
        : undefined;
      if (
        requiresPositiveSetWeight(loadType) &&
        (!setWeight || setWeight <= 0)
      ) {
        alert(`第 ${i + 1} 組請輸入重量`);
        return null;
      }
      details.push({
        reps,
        weightKg: setWeight,
        gear: buildGear(row),
      });
    }

    const loggedAt = combineDateAndTime(dateKey, nowTimeStr());
    if (new Date(loggedAt).getTime() > Date.now()) {
      alert("紀錄時間不能設在未來");
      return null;
    }

    const mainWeight =
      loadType === "bilateral" || loadType === "unilateral"
        ? parseWeightKgInput(setRows[0]?.weightKg || weightKg)
        : 0;
    const firstExtra =
      loadType === "weighted_bw"
        ? parseWeightKgInput(setRows[0]?.weightKg ?? "")
        : undefined;

    return {
      exerciseName: exerciseName.trim(),
      loadType,
      weightKg: mainWeight,
      extraWeightKg:
        loadType === "weighted_bw" ? firstExtra : undefined,
      assistKg:
        loadType === "assisted_bw" ? parseWeightKgInput(assistKg) : undefined,
      reps: details[0]?.reps ?? 0,
      sets: details.length,
      setDetails: details,
      logDate: dateKey,
      loggedAt,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const log = buildLog();
    if (!log) return;
    setSaving(true);
    try {
      await onSave(log);
      // 清表單欄位；菜單進度由父層 advance 負責寫回草稿
      resetFormFields();
      patchWorkoutDraft({
        exerciseName: "",
        weightKg: "",
        extraWeightKg: "",
        assistKg: "",
        setRows: [emptySet()],
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="新增重訓紀錄">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <DateShiftHeader
          dateKey={dateKey}
          onChange={setDateKey}
          title="紀錄"
        />

        {restoredBanner && hasPreset && (
          <div className="flex items-start justify-between gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2">
            <p className="text-xs text-accent-light">
              已還原未完成的打卡（切換 App 也不會丟）
            </p>
            <button
              type="button"
              onClick={discardDraft}
              className="shrink-0 text-xs text-text-muted underline"
            >
              放棄
            </button>
          </div>
        )}

        {!hasPreset ? (
          <p className="rounded-xl border border-border bg-bg-elevated px-3 py-3 text-sm text-text-muted">
            請先從「常用訓練」或「訓練菜單」按帶入，才可開始記錄。
          </p>
        ) : (
          <p className="rounded-lg bg-bg-elevated px-2.5 py-1.5 text-sm">
            <span className="font-semibold text-accent-light">{exerciseName}</span>
            <span className="mx-1.5 text-text-muted">·</span>
            <span className="text-text-muted">{loadTypeLabel(loadType)}</span>
          </p>
        )}

        {hasPreset && loadType === "bodyweight" && (
          <p className="text-xs text-text-muted">
            {bodyWeightKg != null && effectiveBw != null
              ? `依最新體重 ${bodyWeightKg}kg × ${BODYWEIGHT_FACTOR} → 有效 ${effectiveBw}kg`
              : `有效負重 ≈ 體重 × ${BODYWEIGHT_FACTOR}（請先在體態頁更新 InBody）`}
          </p>
        )}
        {hasPreset && loadType === "assisted_bw" && (
          <label className="block text-sm text-text-muted">
            輔助減重 kg
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0}
              value={assistKg}
              onChange={(e) => setAssistKg(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-bg-app px-3 tabular-nums"
              placeholder="例如 10"
            />
          </label>
        )}

        {hasPreset && loadType === "weighted_bw" && (
          <p className="text-xs text-text-muted">
            每組填額外負重；
            {bodyWeightKg != null && effectiveBw != null
              ? `依最新體重 ${bodyWeightKg}kg × ${BODYWEIGHT_FACTOR}（${effectiveBw}kg）+ 額外 kg`
              : `有效負重 ≈ 體重 × ${BODYWEIGHT_FACTOR} + 額外 kg`}
          </p>
        )}

        {hasPreset && (
          <div className="space-y-2">
            <div>
              <p className="text-sm font-semibold text-text-muted">組別</p>
              {exerciseStats && (
                <p className="mt-0.5 text-xs text-text-muted">
                  歷史最高 {formatExerciseSetStat(exerciseStats.max, loadType)} · 常用{" "}
                  {formatExerciseSetStat(exerciseStats.common, loadType)}
                </p>
              )}
            </div>
            {setRows.map((row, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-bg-elevated p-2.5"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-accent-light">
                    第 {i + 1} 組
                  </p>
                  <div className="flex items-center gap-2">
                    {i < setRows.length - 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => copyToNextSet(i)}
                          className="rounded-lg border border-border px-2 py-0.5 text-xs text-text-muted"
                        >
                          帶入下組
                        </button>
                        {i < setRows.length - 2 && (
                          <button
                            type="button"
                            onClick={() => copyToRemainingSets(i)}
                            className="rounded-lg border border-border px-2 py-0.5 text-xs text-text-muted"
                          >
                            全部帶入
                          </button>
                        )}
                      </>
                    )}
                    {setRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSetRows((rows) => rows.filter((_, j) => j !== i))
                        }
                        className="rounded-lg border border-border px-2 py-0.5 text-xs text-text-muted"
                      >
                        刪除
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {needsSetWeightInput(loadType) && (
                    <label className="text-xs text-text-muted">
                      {loadType === "unilateral"
                        ? "單邊 kg"
                        : loadType === "weighted_bw"
                          ? "額外 kg"
                          : "kg"}
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min={0}
                        value={row.weightKg}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSetRows((rows) =>
                            rows.map((r, j) =>
                              j === i ? { ...r, weightKg: v } : r,
                            ),
                          );
                        }}
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 tabular-nums"
                        placeholder={
                          loadType === "unilateral"
                            ? "15"
                            : loadType === "weighted_bw"
                              ? "10"
                              : "60"
                        }
                      />
                    </label>
                  )}
                  <label className="text-xs text-text-muted">
                    次數
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={row.reps}
                      onChange={(e) => {
                        const v = normalizeRepsInput(e.target.value);
                        setSetRows((rows) =>
                          rows.map((r, j) => (j === i ? { ...r, reps: v } : r)),
                        );
                      }}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 tabular-nums"
                      placeholder="10"
                    />
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      ["strap", "拉力帶"],
                      ["belt", "護腰"],
                      ["knee", "護膝"],
                      ["wrist", "護腕"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-1 text-xs text-text-muted"
                    >
                      <input
                        type="checkbox"
                        checked={row[key]}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSetRows((rows) =>
                            rows.map((r, j) =>
                              j === i ? { ...r, [key]: checked } : r,
                            ),
                          );
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSetRows((rows) => [...rows, emptySet()])}
              className="text-xs font-semibold text-accent-light underline"
            >
              + 加一組
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !hasPreset}
          className="min-h-[48px] w-full rounded-xl border border-border bg-bg-elevated text-base font-semibold text-text disabled:opacity-40 active:scale-[0.98]"
        >
          {saving ? "儲存中…" : "打卡入庫"}
        </button>
      </form>
    </Card>
  );
}

/** 從草稿組出 prefill（父層還原菜單時可用） */
export function draftToPrefill(draft: {
  exerciseName: string;
  loadType: WorkoutLoadType;
  weightKg: string;
  extraWeightKg: string;
  assistKg: string;
  setRows: WorkoutDraftSetRow[];
}): WorkoutFormPrefill {
  const details = draftSetRowsToDetails(draft.setRows);
  const firstWeight = details.find((d) => d.weightKg != null)?.weightKg ?? 0;
  return {
    exerciseName: draft.exerciseName,
    loadType: draft.loadType,
    weightKg: Number(draft.weightKg) || firstWeight || 0,
    extraWeightKg:
      draft.loadType === "weighted_bw"
        ? Number(draft.extraWeightKg) || firstWeight || 0
        : undefined,
    assistKg:
      draft.loadType === "assisted_bw"
        ? Number(draft.assistKg) || undefined
        : undefined,
    reps: details[0]?.reps ?? 0,
    sets: Math.max(1, details.length),
    setDetails: details,
  };
}
