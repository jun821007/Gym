"use client";

import { useEffect, useMemo, useState } from "react";
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
  BODYWEIGHT_FACTOR,
  LOAD_TYPE_OPTIONS,
  getLatestBodyWeightKg,
  parseWeightKgInput,
} from "@/lib/workout-volume";

type SetRow = {
  reps: string;
  weightKg: string;
  strap: boolean;
  belt: boolean;
  knee: boolean;
  wrist: boolean;
};

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
}

export function WorkoutAddForm({
  profile,
  workouts = [],
  prefill,
  onPrefillConsumed,
  onSave,
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

  const hasPreset = exerciseName.trim().length > 0;

  const exerciseStats = useMemo(
    () =>
      getExerciseHistoryStats(workouts, exerciseName, bodyWeightKg),
    [workouts, exerciseName, bodyWeightKg],
  );

  useEffect(() => {
    if (!prefill) return;
    setExerciseName(prefill.exerciseName);
    setLoadType(prefill.loadType);
    setWeightKg(prefill.weightKg ? String(prefill.weightKg) : "");
    setExtraWeightKg(
      prefill.extraWeightKg != null ? String(prefill.extraWeightKg) : "",
    );
    setAssistKg(prefill.assistKg != null ? String(prefill.assistKg) : "");
    const w = prefill.weightKg ? String(prefill.weightKg) : "";
    if (prefill.setDetails?.length) {
      setSetRows(prefill.setDetails.map((s) => setRowFromDetail(s, w)));
    } else {
      setSetRows(
        Array.from({ length: Math.max(1, prefill.sets) }, () => ({
          reps: prefill.reps > 0 ? String(prefill.reps) : "",
          weightKg: w,
          strap: false,
          belt: false,
          knee: false,
          wrist: false,
        })),
      );
    }
    onPrefillConsumed?.();
  }, [prefill, onPrefillConsumed]);

  function needsWeight(type: WorkoutLoadType) {
    return type === "bilateral" || type === "unilateral";
  }

  function copyToNextSet(index: number) {
    setSetRows((rows) => {
      if (index < 0 || index >= rows.length - 1) return rows;
      const current = rows[index];
      const next = rows[index + 1];
      const copy: SetRow = {
        ...next,
        weightKg: current.weightKg,
        strap: current.strap,
        belt: current.belt,
        knee: current.knee,
        wrist: current.wrist,
      };
      return rows.map((r, i) => (i === index + 1 ? copy : r));
    });
  }

  function normalizeRepsInput(value: string): string {
    const digits = value.replace(/[^\d]/g, "");
    return digits;
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
      const setWeight =
        loadType === "bilateral" || loadType === "unilateral"
          ? parseWeightKgInput(row.weightKg || weightKg)
          : undefined;
      if (needsWeight(loadType) && (!setWeight || setWeight <= 0)) {
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

    const mainWeight = needsWeight(loadType)
      ? parseWeightKgInput(setRows[0]?.weightKg || weightKg)
      : 0;

    return {
      exerciseName: exerciseName.trim(),
      loadType,
      weightKg: mainWeight,
      extraWeightKg:
        loadType === "weighted_bw"
          ? parseWeightKgInput(extraWeightKg)
          : undefined,
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
      setExerciseName("");
      setLoadType("bilateral");
      setWeightKg("");
      setExtraWeightKg("");
      setAssistKg("");
      setSetRows([emptySet()]);
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

        {!hasPreset ? (
          <p className="rounded-xl border border-border bg-bg-elevated px-3 py-3 text-sm text-text-muted">
            請先從「常用訓練」或「訓練菜單」按帶入，才可開始記錄。
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm text-text-muted">動作（唯讀）</span>
              <input
                type="text"
                value={exerciseName}
                readOnly
                className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-bg-elevated px-3 text-sm text-text"
              />
            </label>

            <label className="block">
              <span className="text-sm text-text-muted">負載類型（唯讀）</span>
              <input
                type="text"
                value={loadTypeLabel(loadType)}
                readOnly
                className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-bg-elevated px-3 text-sm text-text"
              />
            </label>
          </div>
        )}

        {hasPreset && loadType === "bodyweight" && (
          <p className="text-xs text-text-muted">
            有效負重 ≈ 體重 × {BODYWEIGHT_FACTOR}
            {effectiveBw != null ? ` → ${effectiveBw}kg` : "（請先在體態頁更新 InBody）"}
          </p>
        )}
        {hasPreset && loadType === "weighted_bw" && (
          <label className="block text-sm text-text-muted">
            額外負重 kg
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0}
              value={extraWeightKg}
              onChange={(e) => setExtraWeightKg(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-bg-app px-3 tabular-nums"
              placeholder="腰帶 +10"
            />
          </label>
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
                      <button
                        type="button"
                        onClick={() => copyToNextSet(i)}
                        className="rounded-lg border border-border px-2 py-0.5 text-xs text-text-muted"
                      >
                        帶入下組
                      </button>
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
                  {needsWeight(loadType) && (
                    <label className="text-xs text-text-muted">
                      {loadType === "unilateral" ? "單邊 kg" : "kg"}
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
                        placeholder={loadType === "unilateral" ? "15" : "60"}
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
