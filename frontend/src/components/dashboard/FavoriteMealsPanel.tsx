"use client";

import { Card } from "@/components/ui/Card";
import { combineDateAndTime, nowTimeStr } from "@/lib/logged-at";
import { mealTypeFromHour } from "@/lib/meal-type";
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
  if (favorites.length === 0) return null;

  async function addFavorite(fav: FavoriteMeal) {
    await onQuickAdd({
      foodName: fav.name,
      calories: fav.calories,
      proteinG: fav.proteinG,
      carbsG: fav.carbsG,
      fatG: fav.fatG,
      mealType: fav.defaultMealType ?? mealTypeFromHour(),
      loggedAt: combineDateAndTime(recordDate, nowTimeStr()),
    });
  }

  return (
    <Card title="常吃">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {favorites.map((fav) => (
          <div
            key={fav.id}
            className="min-w-[140px] shrink-0 rounded-xl border border-border bg-bg-elevated p-3"
          >
            <p className="line-clamp-2 text-sm font-semibold">{fav.name}</p>
            <p className="mt-1 text-xs tabular-nums text-accent">
              蛋白 {fav.proteinG}g
            </p>
            <p className="text-xs tabular-nums text-text-muted">
              {fav.calories} kcal
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
                onClick={() => {
                  if (confirm(`刪除常吃「${fav.name}」？`)) {
                    void onDelete(fav.id);
                  }
                }}
                className="min-h-[32px] rounded-lg border border-border px-2 text-xs text-text-muted"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
