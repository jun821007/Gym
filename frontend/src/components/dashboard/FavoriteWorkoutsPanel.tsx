"use client";

import { useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  WORKOUT_CATEGORY_LABELS,
  WORKOUT_CATEGORY_ORDER,
} from "@/lib/workout-categories";
import type { FavoriteWorkout, WorkoutCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 480;
const MOVE_CANCEL_PX = 10;

interface FavoriteWorkoutsPanelProps {
  favorites: FavoriteWorkout[];
  onApplyName: (name: string) => void;
  onDelete: (id: string) => void | Promise<void>;
}

function FavoriteChip({
  fav,
  onApplyName,
  onRequestDelete,
}: {
  fav: FavoriteWorkout;
  onApplyName: (name: string) => void;
  onRequestDelete: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function movedTooFar(clientX: number, clientY: number) {
    const s = startRef.current;
    if (!s) return false;
    return (
      Math.abs(clientX - s.x) > MOVE_CANCEL_PX ||
      Math.abs(clientY - s.y) > MOVE_CANCEL_PX
    );
  }

  function onPressStart(clientX: number, clientY: number) {
    longPressRef.current = false;
    startRef.current = { x: clientX, y: clientY };
    clearTimer();
    timerRef.current = setTimeout(() => {
      longPressRef.current = true;
      onRequestDelete();
    }, LONG_PRESS_MS);
  }

  function onPressMove(clientX: number, clientY: number) {
    if (movedTooFar(clientX, clientY)) clearTimer();
  }

  function onPressEnd(clientX: number, clientY: number) {
    clearTimer();
    if (longPressRef.current || movedTooFar(clientX, clientY)) return;
    onApplyName(fav.name);
  }

  return (
    <button
      type="button"
      title={fav.name}
      className={cn(
        "max-w-[7.5rem] shrink-0 truncate rounded-lg border border-border bg-bg-elevated",
        "px-2.5 py-1.5 text-xs font-semibold text-accent-light",
        "select-none touch-manipulation active:bg-accent/20",
      )}
      style={{ WebkitTouchCallout: "none" }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        onPressStart(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => onPressMove(e.clientX, e.clientY)}
      onPointerUp={(e) => onPressEnd(e.clientX, e.clientY)}
      onPointerLeave={clearTimer}
      onPointerCancel={clearTimer}
    >
      {fav.name}
    </button>
  );
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
      if (!fav.category) continue;
      map[fav.category].push(fav);
    }
    return map;
  }, [favorites]);

  const activeItems = grouped[activeCategory];

  if (favorites.length === 0) return null;

  return (
    <>
      <Card title="常用訓練">
        <div className="mb-2 flex gap-1.5">
          {WORKOUT_CATEGORY_ORDER.map((cat) => {
            const count = grouped[cat].length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "min-h-[32px] flex-1 rounded-lg border text-xs font-semibold",
                  activeCategory === cat
                    ? "border-accent bg-accent/20 text-accent-light"
                    : "border-border bg-bg-elevated text-text-muted",
                )}
              >
                {WORKOUT_CATEGORY_LABELS[cat]}
                {count > 0 && (
                  <span className="ml-0.5 opacity-80">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        {activeItems.length === 0 ? (
          <p className="py-2 text-center text-xs text-text-muted">
            尚無{WORKOUT_CATEGORY_LABELS[activeCategory]}常用動作
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {activeItems.map((fav) => (
              <FavoriteChip
                key={fav.id}
                fav={fav}
                onApplyName={onApplyName}
                onRequestDelete={() => setPendingDeleteId(fav.id)}
              />
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
