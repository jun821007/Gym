"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/Card";
import type {
  FavoriteWorkout,
  FavoriteWorkoutExercise,
} from "@/lib/types";
import { LOAD_TYPE_OPTIONS } from "@/lib/workout-volume";

interface WorkoutMenusPanelProps {
  menus: FavoriteWorkout[];
  onApplyExercise: (ex: FavoriteWorkoutExercise) => void;
  onDelete: (id: string) => void | Promise<void>;
  defaultOpen?: boolean;
}

function loadTypeLabel(loadType: FavoriteWorkoutExercise["loadType"]) {
  return (
    LOAD_TYPE_OPTIONS.find((o) => o.value === loadType)?.label ?? loadType
  );
}

export function WorkoutMenusPanel({
  menus,
  onApplyExercise,
  onDelete,
  defaultOpen = true,
}: WorkoutMenusPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [activeMenu, setActiveMenu] = useState<FavoriteWorkout | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FavoriteWorkout | null>(
    null,
  );

  const sorted = useMemo(
    () =>
      [...menus].filter((m) => (m.kind ?? "exercise") === "menu"),
    [menus],
  );

  if (sorted.length === 0) return null;

  return (
    <>
      <Card>
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setOpen((o) => !o)}
        >
          <div>
            <span className="card-title mb-0">訓練菜單</span>
            <p className="mt-1 text-xs text-text-muted">
              {sorted.length} 份 · 點選後勾動作帶入表單
            </p>
          </div>
          <span className="text-sm text-text-muted">{open ? "收起" : "展開"}</span>
        </button>

        {open && (
          <div className="mt-3 space-y-2">
            {sorted.map((menu) => (
              <div
                key={menu.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated p-3"
              >
                <button
                  type="button"
                  onClick={() => setActiveMenu(menu)}
                  className="min-w-0 flex-1 text-left active:scale-[0.99]"
                >
                  <p className="text-sm font-semibold text-accent-light">
                    {menu.name}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {menu.exercises.length} 個動作
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(menu)}
                  className="min-h-[36px] shrink-0 rounded-lg border border-border px-3 text-xs text-text-muted"
                >
                  刪除
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {activeMenu &&
        createPortal(
          <div
            className="fixed inset-0 z-[220] flex items-end justify-center bg-black/55 p-4 sm:items-center"
            onClick={() => setActiveMenu(null)}
          >
            <div
              role="dialog"
              className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-bg-card p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-bold text-accent-light">
                {activeMenu.name}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                點選動作帶入今日紀錄表單（次數／重量留空，自行填寫）
              </p>
              <ul className="mt-3 space-y-2">
                {activeMenu.exercises.map((ex, i) => (
                  <li key={`${ex.exerciseName}-${i}`}>
                    <button
                      type="button"
                      onClick={() => {
                        onApplyExercise(ex);
                        setActiveMenu(null);
                      }}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-bg-elevated px-3 py-3 text-left active:scale-[0.99]"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-text">
                          {ex.exerciseName}
                        </span>
                        <span className="mt-0.5 block text-xs text-text-muted">
                          {loadTypeLabel(ex.loadType)}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-accent-light">
                        帶入
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setActiveMenu(null)}
                className="mt-4 min-h-[44px] w-full rounded-xl border border-border bg-bg-elevated text-sm font-semibold"
              >
                關閉
              </button>
            </div>
          </div>,
          document.body,
        )}

      {pendingDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div
            role="dialog"
            className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-4"
          >
            <h3 className="text-sm font-bold text-accent-light">刪除訓練菜單？</h3>
            <p className="mt-2 text-sm text-text-muted">
              確定要刪除「{pendingDelete.name}」嗎？此動作無法復原。
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="min-h-[44px] flex-1 rounded-xl border border-border bg-bg-elevated text-sm"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  void onDelete(pendingDelete.id);
                  setPendingDelete(null);
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
