"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { combineDateAndTime } from "@/lib/logged-at";
import { defaultTimeForMealType, mealTypeFromHour } from "@/lib/meal-type";
import type { DietLog, FavoriteMeal } from "@/lib/types";

interface FavoriteMealsPanelProps {
  favorites: FavoriteMeal[];
  recordDate: string;
  onQuickAddMany: (logs: Omit<DietLog, "id">[]) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

export function FavoriteMealsPanel({
  favorites,
  recordDate,
  onQuickAddMany,
  onDelete,
}: FavoriteMealsPanelProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [mealType, setMealType] = useState<NonNullable<DietLog["mealType"]>>(
    "breakfast",
  );
  const [bundleName, setBundleName] = useState("");
  const pending = favorites.find((f) => f.id === pendingDeleteId);

  if (favorites.length === 0) return null;

  const grouped = useMemo(() => {
    const map = new Map<string, FavoriteMeal[]>();
    for (const fav of favorites) {
      const meal = fav.defaultMealType ?? mealTypeFromHour();
      const key = fav.bundleName?.trim() || fav.name;
      const id = `${meal}::${key}`;
      const list = map.get(id) ?? [];
      list.push(fav);
      map.set(id, list);
    }
    return map;
  }, [favorites]);

  const bundleOptions = useMemo(() => {
    const list: { key: string; label: string; items: FavoriteMeal[] }[] = [];
    for (const [id, items] of grouped.entries()) {
      const [meal, key] = id.split("::");
      if (meal !== mealType) continue;
      const calories = items.reduce((s, x) => s + x.calories, 0);
      list.push({
        key,
        label: `${key}（${items.length} 項 · ${Math.round(calories)} kcal）`,
        items,
      });
    }
    return list.sort((a, b) => a.key.localeCompare(b.key, "zh-TW"));
  }, [grouped, mealType]);

  const selectedBundle = useMemo(
    () => bundleOptions.find((b) => b.key === bundleName) ?? null,
    [bundleOptions, bundleName],
  );

  async function addBundle() {
    if (!selectedBundle) {
      alert("請先選擇套餐");
      return;
    }
    const logs = selectedBundle.items.map((fav) => {
      const m = fav.defaultMealType ?? mealType;
      return {
        foodName: fav.name,
        calories: fav.calories,
        proteinG: fav.proteinG,
        carbsG: fav.carbsG,
        fatG: fav.fatG,
        sodiumMg: fav.sodiumMg ?? 0,
        fiberG: fav.fiberG ?? 0,
        mealType: m,
        loggedAt: combineDateAndTime(recordDate, defaultTimeForMealType(m)),
      };
    });
    await onQuickAddMany(logs);
  }

  return (
    <>
      <Card title="常吃">
        <div className="space-y-2">
          <label className="block text-xs text-text-muted">
            餐期
            <select
              value={mealType}
              onChange={(e) => {
                const next = e.target.value as NonNullable<DietLog["mealType"]>;
                setMealType(next);
                setBundleName("");
              }}
              className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 text-sm"
            >
              <option value="breakfast">早餐</option>
              <option value="lunch">午餐</option>
              <option value="dinner">晚餐</option>
              <option value="snack">點心</option>
            </select>
          </label>

          <label className="block text-xs text-text-muted">
            套餐
            <select
              value={bundleName}
              onChange={(e) => setBundleName(e.target.value)}
              className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 text-sm"
            >
              <option value="">
                {bundleOptions.length === 0 ? "此餐期尚無常吃套餐" : "請選擇套餐"}
              </option>
              {bundleOptions.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={!selectedBundle}
            onClick={() => void addBundle()}
            className="min-h-[40px] w-full rounded-lg bg-accent/20 text-sm font-bold text-accent-light disabled:opacity-40"
          >
            新增套餐到今日紀錄
          </button>

          <div className="max-h-44 overflow-y-auto space-y-1">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg-elevated px-2.5 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-text">
                    {fav.bundleName?.trim() || fav.name}
                    <span className="ml-1 font-normal text-text-muted">
                      · {fav.name}
                    </span>
                  </p>
                  <p className="text-[11px] text-text-muted tabular-nums">
                    {fav.calories} kcal · P{fav.proteinG} C{fav.carbsG} F{fav.fatG}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(fav.id)}
                  className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] text-text-muted"
                >
                  刪除
                </button>
              </div>
            ))}
          </div>
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
