"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { combineDateAndTime } from "@/lib/logged-at";
import { defaultTimeForMealType, mealTypeFromHour } from "@/lib/meal-type";
import type { DietLog, FavoriteMeal } from "@/lib/types";

interface FavoriteMealsPanelProps {
  favorites: FavoriteMeal[];
  recordDate: string;
  onQuickAdd: (log: Omit<DietLog, "id">) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

export function FavoriteMealsPanel({
  favorites,
  recordDate,
  onQuickAdd,
  onDelete,
}: FavoriteMealsPanelProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pending = favorites.find((f) => f.id === pendingDeleteId);

  if (favorites.length === 0) return null;

  async function addFavorite(fav: FavoriteMeal) {
    await onQuickAdd({
      foodName: fav.name,
      calories: fav.calories,
      proteinG: fav.proteinG,
      carbsG: fav.carbsG,
      fatG: fav.fatG,
      sodiumMg: fav.sodiumMg ?? 0,
      fiberG: fav.fiberG ?? 0,
      mealType: fav.defaultMealType ?? mealTypeFromHour(),
      loggedAt: combineDateAndTime(
        recordDate,
        defaultTimeForMealType(fav.defaultMealType ?? mealTypeFromHour()),
      ),
    });
  }

  return (
    <>
      <Card title="常吃">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="min-w-[160px] shrink-0 rounded-xl border border-border bg-bg-elevated p-3"
            >
              <p className="line-clamp-2 text-sm font-semibold">{fav.name}</p>
              <p className="mt-1 text-xs font-semibold tabular-nums text-accent">
                蛋白 {fav.proteinG}g · {fav.calories} kcal
              </p>
              <p className="text-xs tabular-nums text-text-muted">
                碳水 {fav.carbsG}g · 脂肪 {fav.fatG}g · 纖維 {fav.fiberG ?? 0}g · 鈉 {fav.sodiumMg ?? 0}mg
              </p>
              <div className="mt-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => void addFavorite(fav)}
                  className="min-h-[32px] flex-1 rounded-lg bg-accent/20 text-xs font-bold text-accent-light"
                >
                  新增
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
            <h3 className="text-sm font-bold text-accent-light">刪除常吃？</h3>
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
