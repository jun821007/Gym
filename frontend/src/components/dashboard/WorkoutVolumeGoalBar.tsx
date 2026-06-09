"use client";

import { useState } from "react";
import { NutrientBar } from "@/components/ui/NutrientBar";
import {
  MAX_WORKOUT_VOLUME_GOAL_KG,
  MIN_WORKOUT_VOLUME_GOAL_KG,
  workoutVolumeProgressPct,
} from "@/lib/workout-volume-goal";

interface WorkoutVolumeGoalBarProps {
  currentKg: number;
  goalKg: number;
  suggestedKg: number | null;
  hasUserGoal: boolean;
  onGoalChange: (goalKg: number) => void | Promise<void>;
}

export function WorkoutVolumeGoalBar({
  currentKg,
  goalKg,
  suggestedKg,
  hasUserGoal,
  onGoalChange,
}: WorkoutVolumeGoalBarProps) {
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(String(goalKg));
  const pct = workoutVolumeProgressPct(currentKg, goalKg);

  async function handleSaveGoal() {
    const n = Number(goalDraft);
    if (
      !Number.isFinite(n) ||
      n < MIN_WORKOUT_VOLUME_GOAL_KG ||
      n > MAX_WORKOUT_VOLUME_GOAL_KG
    ) {
      alert(
        `目標請設 ${MIN_WORKOUT_VOLUME_GOAL_KG}–${MAX_WORKOUT_VOLUME_GOAL_KG} kg`,
      );
      return;
    }
    await onGoalChange(Math.round(n));
    setEditingGoal(false);
  }

  return (
    <div className="mb-3 space-y-2 border-b border-border pb-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-text-muted">目標訓練量</p>
        <div className="flex flex-wrap items-center gap-2">
          {suggestedKg != null && (
            <span className="text-xs text-text-muted">
              建議 {suggestedKg} kg
            </span>
          )}
          {suggestedKg != null && suggestedKg !== goalKg && (
            <button
              type="button"
              onClick={() => void onGoalChange(suggestedKg)}
              className="rounded-lg border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent-light"
            >
              採用建議
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (editingGoal) void handleSaveGoal();
              else {
                setGoalDraft(String(goalKg));
                setEditingGoal(true);
              }
            }}
            className="rounded-lg border border-border bg-bg-elevated px-2 py-0.5 text-xs font-semibold text-text-muted"
          >
            {editingGoal ? "儲存" : "自訂"}
          </button>
        </div>
      </div>

      {editingGoal ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="number"
            inputMode="numeric"
            min={MIN_WORKOUT_VOLUME_GOAL_KG}
            max={MAX_WORKOUT_VOLUME_GOAL_KG}
            step={100}
            value={goalDraft}
            onChange={(e) => setGoalDraft(e.target.value)}
            className="min-h-[40px] flex-1 rounded-lg border border-border bg-bg-app px-3 tabular-nums outline-none focus:border-accent"
          />
          <span className="text-text-muted">kg</span>
        </label>
      ) : (
        <p className="text-xs text-text-muted">
          目標 {goalKg} kg
          {!hasUserGoal && suggestedKg == null && "（預設）"}
          {!hasUserGoal && suggestedKg != null && "（依建議）"}
        </p>
      )}

      <NutrientBar
        label="今日進度"
        current={Math.round(currentKg)}
        goal={goalKg}
        unit="kg"
        color="#38bd94"
      />
      <p className="text-right text-xs tabular-nums text-text-muted">{pct}%</p>
    </div>
  );
}
