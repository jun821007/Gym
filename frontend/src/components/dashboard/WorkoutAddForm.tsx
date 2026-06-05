"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { toDateKey } from "@/lib/datetime";
import type {
  FavoriteWorkoutExercise,
  UserProfile,
  WorkoutLoadType,
  WorkoutLog,
  WorkoutSetDetail,
} from "@/lib/types";
import {
  BODYWEIGHT_FACTOR,
  LOAD_TYPE_OPTIONS,
  getLatestBodyWeightKg,
} from "@/lib/workout-volume";

type SetRow = {
  reps: string;
  weightKg: string;
  strap: boolean;
  belt: boolean;
  knee: boolean;
};

const emptySet = (): SetRow => ({
  reps: "",
  weightKg: "",
  strap: false,
  belt: false,
  knee: false,
});

function setRowFromDetail(s: WorkoutSetDetail, defaultWeight: string): SetRow {
  return {
    reps: String(s.reps),
    weightKg: s.weightKg != null ? String(s.weightKg) : defaultWeight,
    strap: s.gear?.includes("strap") ?? false,
    belt: s.gear?.includes("belt") ?? false,
    knee: s.gear?.includes("knee") ?? false,
  };
}

function buildGear(row: SetRow): WorkoutSetDetail["gear"] {
  const g: NonNullable<WorkoutSetDetail["gear"]> = [];
  if (row.strap) g.push("strap");
  if (row.belt) g.push("belt");
  if (row.knee) g.push("knee");
  return g.length ? g : undefined;
}

export type WorkoutFormPrefill = Omit<WorkoutLog, "id" | "logDate" | "loggedAt">;

export interface WorkoutAddFormProps {
  profile: UserProfile;
  prefill?: WorkoutFormPrefill | null;
  exerciseNamePrefill?: string | null;
  onPrefillConsumed?: () => void;
  onExerciseNamePrefillConsumed?: () => void;
  onSave: (log: Omit<WorkoutLog, "id">) => void | Promise<void>;
  onSaveFavorite?: (fav: {
    name: string;
    exercises: FavoriteWorkoutExercise[];
  }) => void | Promise<void>;
}

export function WorkoutAddForm({
  profile,
  prefill,
  exerciseNamePrefill,
  onPrefillConsumed,
  onExerciseNamePrefillConsumed,
  onSave,
  onSaveFavorite,
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
  const [addFavorite, setAddFavorite] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!exerciseNamePrefill) return;
    setExerciseName(exerciseNamePrefill);
    onExerciseNamePrefillConsumed?.();
  }, [exerciseNamePrefill, onExerciseNamePrefillConsumed]);

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
        Array.from({ length: prefill.sets }, () => ({
          reps: String(prefill.reps),
          weightKg: w,
          strap: false,
          belt: false,
          knee: false,
        })),
      );
    }
    onPrefillConsumed?.();
  }, [prefill, onPrefillConsumed]);

  function needsWeight(type: WorkoutLoadType) {
    return type === "bilateral" || type === "unilateral";
  }

  function buildLog(): Omit<WorkoutLog, "id"> | null {
    if (!exerciseName.trim()) {
      alert("請輸入動作名稱");
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
          ? Number(row.weightKg || weightKg) || 0
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

    const now = new Date();
    const mainWeight = needsWeight(loadType)
      ? Number(setRows[0]?.weightKg || weightKg) || 0
      : 0;

    return {
      exerciseName: exerciseName.trim(),
      loadType,
      weightKg: mainWeight,
      extraWeightKg:
        loadType === "weighted_bw" ? Number(extraWeightKg) || 0 : undefined,
      assistKg: loadType === "assisted_bw" ? Number(assistKg) || 0 : undefined,
      reps: details[0]?.reps ?? 0,
      sets: details.length,
      setDetails: details,
      logDate: toDateKey(now),
      loggedAt: now.toISOString(),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const log = buildLog();
    if (!log) return;
    setSaving(true);
    try {
      await onSave(log);
      if (addFavorite && onSaveFavorite) {
        await onSaveFavorite({
          name: log.exerciseName,
          exercises: [
            {
              exerciseName: log.exerciseName,
              loadType: log.loadType,
              weightKg: log.weightKg,
              extraWeightKg: log.extraWeightKg,
              assistKg: log.assistKg,
              setDetails: log.setDetails,
              reps: log.reps,
              sets: log.sets,
            },
          ],
        });
      }
      setExerciseName("");
      setWeightKg("");
      setExtraWeightKg("");
      setAssistKg("");
      setSetRows([emptySet()]);
      setAddFavorite(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="新增重訓紀錄">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <label className="block">
          <span className="text-sm text-text-muted">動作</span>
          <input
            type="text"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            className="mt-1 min-h-[48px] w-full rounded-xl border border-border bg-bg-app px-3 text-base outline-none focus:border-accent"
            placeholder="例如：硬舉、引體向上"
          />
        </label>

        <label className="block">
          <span className="text-sm text-text-muted">負載類型</span>
          <select
            value={loadType}
            onChange={(e) => setLoadType(e.target.value as WorkoutLoadType)}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-bg-app px-3 text-sm"
          >
            {LOAD_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {loadType === "bodyweight" && (
          <p className="text-xs text-text-muted">
            有效負重 ≈ 體重 × {BODYWEIGHT_FACTOR}
            {effectiveBw != null ? ` → ${effectiveBw}kg` : "（請先在體態頁更新 InBody）"}
          </p>
        )}
        {loadType === "weighted_bw" && (
          <label className="block text-sm text-text-muted">
            額外負重 kg
            <input
              type="number"
              min={0}
              value={extraWeightKg}
              onChange={(e) => setExtraWeightKg(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-bg-app px-3 tabular-nums"
              placeholder="腰帶 +10"
            />
          </label>
        )}
        {loadType === "assisted_bw" && (
          <label className="block text-sm text-text-muted">
            輔助減重 kg
            <input
              type="number"
              min={0}
              value={assistKg}
              onChange={(e) => setAssistKg(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-bg-app px-3 tabular-nums"
            />
          </label>
        )}

        <div className="space-y-2">
          <p className="text-sm font-semibold text-text-muted">組別</p>
          {setRows.map((row, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-bg-elevated p-2.5"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-accent-light">
                  第 {i + 1} 組
                </p>
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
              <div className="grid grid-cols-2 gap-2">
                {needsWeight(loadType) && (
                  <label className="text-xs text-text-muted">
                    {loadType === "unilateral" ? "單邊 kg" : "kg"}
                    <input
                      type="number"
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
                    />
                  </label>
                )}
                <label className="text-xs text-text-muted">
                  次數
                  <input
                    type="number"
                    min={1}
                    value={row.reps}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSetRows((rows) =>
                        rows.map((r, j) => (j === i ? { ...r, reps: v } : r)),
                      );
                    }}
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 tabular-nums"
                  />
                </label>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["strap", "拉力帶"],
                    ["belt", "護腰"],
                    ["knee", "護膝"],
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

        {onSaveFavorite && (
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={addFavorite}
              onChange={(e) => setAddFavorite(e.target.checked)}
            />
            加入常用訓練
          </label>
        )}

        <button
          type="submit"
          disabled={saving}
          className="min-h-[48px] w-full rounded-xl border border-border bg-bg-elevated text-base font-semibold text-text disabled:opacity-40 active:scale-[0.98]"
        >
          {saving ? "儲存中…" : "打卡入庫"}
        </button>
      </form>
    </Card>
  );
}
