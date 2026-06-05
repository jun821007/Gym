"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import type { FavoriteWorkout, WorkoutLog } from "@/lib/types";
import { toDateKey } from "@/lib/datetime";

interface FavoriteWorkoutsPanelProps {
  favorites: FavoriteWorkout[];
  onQuickAdd: (logs: Omit<WorkoutLog, "id">[]) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

export function FavoriteWorkoutsPanel({
  favorites,
  onQuickAdd,
  onDelete,
}: FavoriteWorkoutsPanelProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pending = favorites.find((f) => f.id === pendingDeleteId);

  if (favorites.length === 0) return null;

  async function addTemplate(fav: FavoriteWorkout) {
    const now = new Date();
    const logDate = toDateKey(now);
    const loggedAt = now.toISOString();
    const logs: Omit<WorkoutLog, "id">[] = fav.exercises.map((ex) => ({
      exerciseName: ex.exerciseName,
      loadType: ex.loadType ?? "bilateral",
      weightKg: ex.weightKg ?? 0,
      extraWeightKg: ex.extraWeightKg,
      assistKg: ex.assistKg,
      reps: ex.reps ?? ex.setDetails?.[0]?.reps ?? 0,
      sets: ex.sets ?? ex.setDetails?.length ?? 1,
      setDetails: ex.setDetails,
      logDate,
      loggedAt,
    }));
    await onQuickAdd(logs);
  }

  return (
    <>
      <Card title="常用訓練">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="min-w-[150px] shrink-0 rounded-xl border border-border bg-bg-elevated p-3"
            >
              <p className="line-clamp-2 text-sm font-semibold">{fav.name}</p>
              <p className="mt-1 text-xs text-text-muted">
                {fav.exercises.length} 個動作
              </p>
              <div className="mt-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => void addTemplate(fav)}
                  className="min-h-[32px] flex-1 rounded-lg bg-accent/20 text-xs font-bold text-accent-light"
                >
                  帶入
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(fav.id)}
                  className="min-h-[32px] rounded-lg border border-border px-2.5 text-xs text-text-muted"
                >
                  刪除
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {pending && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div
            role="dialog"
            className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-4"
          >
            <h3 className="text-sm font-bold text-accent-light">刪除常用訓練？</h3>
            <p className="mt-2 text-sm text-text-muted">
              確定要刪除「{pending.name}」嗎？此動作無法復原。
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="min-h-[44px] flex-1 rounded-xl border border-border bg-bg-elevated text-sm"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  void onDelete(pending.id);
                  setPendingDeleteId(null);
                }}
                className="min-h-[44px] flex-1 rounded-xl bg-danger text-sm font-bold text-white"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
