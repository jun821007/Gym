"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  WORKOUT_CATEGORY_LABELS,
  WORKOUT_CATEGORY_ORDER,
} from "@/lib/workout-categories";
import type { FavoriteWorkout, WorkoutCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FavoriteWorkoutsPanelProps {
  favorites: FavoriteWorkout[];
  onApplyName: (name: string) => void;
  onDelete: (id: string) => void | Promise<void>;
}

export function FavoriteWorkoutsPanel({
  favorites,
  onApplyName,
  onDelete,
}: FavoriteWorkoutsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<WorkoutCategory>("back");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pending = favorites.find((f) => f.id === pendingDeleteId);

  const grouped = useMemo(() => {
    const map: Record<WorkoutCategory, FavoriteWorkout[]> = {
      back: [],
      legs: [],
      chest: [],
      shoulders: [],
    };
    for (const fav of favorites) {
      map[fav.category].push(fav);
    }
    return map;
  }, [favorites]);

  const activeItems = grouped[activeCategory];

  if (favorites.length === 0) return null;

  return (
    <>
      <Card title="常用訓練">
        <div className="mb-3 flex gap-1.5">
          {WORKOUT_CATEGORY_ORDER.map((cat) => {
            const count = grouped[cat].length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "min-h-[36px] flex-1 rounded-lg border text-sm font-semibold",
                  activeCategory === cat
                    ? "border-accent bg-accent/20 text-accent-light"
                    : "border-border bg-bg-elevated text-text-muted",
                )}
              >
                {WORKOUT_CATEGORY_LABELS[cat]}
                {count > 0 && (
                  <span className="ml-1 text-xs opacity-80">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        {activeItems.length === 0 ? (
          <p className="py-3 text-center text-sm text-text-muted">
            尚無{WORKOUT_CATEGORY_LABELS[activeCategory]}常用動作
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {activeItems.map((fav) => (
              <div
                key={fav.id}
                className="min-w-[150px] shrink-0 rounded-xl border border-border bg-bg-elevated p-3"
              >
                <p className="line-clamp-2 text-sm font-semibold">{fav.name}</p>
                <div className="mt-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => onApplyName(fav.name)}
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
        )}
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
