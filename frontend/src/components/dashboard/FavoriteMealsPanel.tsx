"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { combineDateAndTime } from "@/lib/logged-at";
import { defaultTimeForMealType } from "@/lib/meal-type";
import type { DietLog, FavoriteMeal } from "@/lib/types";
import { cn } from "@/lib/utils";

const MEAL_TABS: { value: NonNullable<DietLog["mealType"]>; label: string }[] =
  [
    { value: "breakfast", label: "早餐" },
    { value: "lunch", label: "午餐" },
    { value: "dinner", label: "晚餐" },
    { value: "snack", label: "點心" },
  ];

type MealBundle = {
  mealType: NonNullable<DietLog["mealType"]>;
  name: string;
  items: FavoriteMeal[];
  calories: number;
  proteinG: number;
};

interface FavoriteMealsPanelProps {
  favorites: FavoriteMeal[];
  recordDate: string;
  onQuickAddMany: (logs: Omit<DietLog, "id">[]) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onDeleteMany?: (ids: string[]) => void | Promise<void>;
}

function resolveMealType(
  fav: FavoriteMeal,
): NonNullable<DietLog["mealType"]> {
  return fav.defaultMealType ?? "lunch";
}

export function FavoriteMealsPanel({
  favorites,
  recordDate,
  onQuickAddMany,
  onDelete,
  onDeleteMany,
}: FavoriteMealsPanelProps) {
  const [mealType, setMealType] = useState<NonNullable<DietLog["mealType"]>>(
    "breakfast",
  );
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [pendingBundle, setPendingBundle] = useState<MealBundle | null>(null);
  const [pendingSingle, setPendingSingle] = useState<FavoriteMeal | null>(null);

  const { bundles, singles } = useMemo(() => {
    const bundleMap = new Map<string, FavoriteMeal[]>();
    const ungrouped: FavoriteMeal[] = [];

    for (const fav of favorites) {
      const meal = resolveMealType(fav);
      const name = fav.bundleName?.trim();
      if (!name) {
        ungrouped.push(fav);
        continue;
      }
      const key = `${meal}::${name}`;
      const list = bundleMap.get(key) ?? [];
      list.push(fav);
      bundleMap.set(key, list);
    }

    const allBundles: MealBundle[] = [];
    for (const [key, items] of bundleMap.entries()) {
      const [meal, name] = key.split("::");
      allBundles.push({
        mealType: meal as NonNullable<DietLog["mealType"]>,
        name,
        items,
        calories: items.reduce((s, x) => s + x.calories, 0),
        proteinG: items.reduce((s, x) => s + x.proteinG, 0),
      });
    }
    allBundles.sort((a, b) => a.name.localeCompare(b.name, "zh-TW"));

    return { bundles: allBundles, singles: ungrouped };
  }, [favorites]);

  const mealBundles = useMemo(
    () => bundles.filter((b) => b.mealType === mealType),
    [bundles, mealType],
  );

  const mealSingles = useMemo(
    () => singles.filter((f) => resolveMealType(f) === mealType),
    [singles, mealType],
  );

  const mealCounts = useMemo(() => {
    const map: Record<string, number> = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0,
    };
    for (const b of bundles) map[b.mealType] += 1;
    for (const f of singles) map[resolveMealType(f)] += 1;
    return map;
  }, [bundles, singles]);

  if (favorites.length === 0) return null;

  async function addBundle(bundle: MealBundle) {
    const key = `${bundle.mealType}::${bundle.name}`;
    setAddingKey(key);
    try {
      const logs = bundle.items.map((fav) => ({
        foodName: fav.name,
        calories: fav.calories,
        proteinG: fav.proteinG,
        carbsG: fav.carbsG,
        fatG: fav.fatG,
        sodiumMg: fav.sodiumMg ?? 0,
        fiberG: fav.fiberG ?? 0,
        mealType: bundle.mealType,
        loggedAt: combineDateAndTime(
          recordDate,
          defaultTimeForMealType(bundle.mealType),
        ),
      }));
      await onQuickAddMany(logs);
    } catch (e) {
      alert(e instanceof Error ? e.message : "新增套餐失敗");
    } finally {
      setAddingKey(null);
    }
  }

  async function addSingle(fav: FavoriteMeal) {
    const meal = resolveMealType(fav);
    setAddingKey(fav.id);
    try {
      await onQuickAddMany([
        {
          foodName: fav.name,
          calories: fav.calories,
          proteinG: fav.proteinG,
          carbsG: fav.carbsG,
          fatG: fav.fatG,
          sodiumMg: fav.sodiumMg ?? 0,
          fiberG: fav.fiberG ?? 0,
          mealType: meal,
          loggedAt: combineDateAndTime(
            recordDate,
            defaultTimeForMealType(meal),
          ),
        },
      ]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "新增失敗");
    } finally {
      setAddingKey(null);
    }
  }

  async function confirmDeleteBundle() {
    if (!pendingBundle) return;
    const ids = pendingBundle.items.map((i) => i.id);
    try {
      if (onDeleteMany) {
        await onDeleteMany(ids);
      } else {
        for (const id of ids) await onDelete(id);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "刪除失敗");
    } finally {
      setPendingBundle(null);
    }
  }

  return (
    <>
      <Card title="常吃套餐">
        <div className="mb-3 flex gap-1.5">
          {MEAL_TABS.map((tab) => {
            const count = mealCounts[tab.value] ?? 0;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setMealType(tab.value)}
                className={cn(
                  "min-h-[36px] flex-1 rounded-lg border text-xs font-semibold",
                  mealType === tab.value
                    ? "border-accent bg-accent/20 text-accent-light"
                    : "border-border bg-bg-elevated text-text-muted",
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-0.5 opacity-80">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          {mealBundles.length === 0 && mealSingles.length === 0 ? (
            <p className="py-3 text-center text-sm text-text-muted">
              此餐期尚無套餐。新增餐點時勾「加入常吃」並填套餐名稱即可建立。
            </p>
          ) : null}

          {mealBundles.map((bundle) => {
            const key = `${bundle.mealType}::${bundle.name}`;
            const busy = addingKey === key;
            return (
              <div
                key={key}
                className="rounded-xl border border-border bg-bg-elevated p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-accent-light">
                      {bundle.name}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-text-muted">
                      {bundle.items.length} 品 · {Math.round(bundle.calories)}{" "}
                      kcal · 蛋白 {Math.round(bundle.proteinG)}g
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingBundle(bundle)}
                    className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] text-text-muted"
                  >
                    刪除套餐
                  </button>
                </div>

                <ul className="mt-2 space-y-1 border-t border-border/60 pt-2">
                  {bundle.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-baseline justify-between gap-2 text-xs"
                    >
                      <span className="min-w-0 truncate text-text">
                        {item.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-text-muted">
                        {item.calories} kcal
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void addBundle(bundle)}
                  className="mt-3 min-h-[40px] w-full rounded-lg bg-accent/20 text-sm font-bold text-accent-light disabled:opacity-40"
                >
                  {busy
                    ? "新增中…"
                    : `一次新增整份（${bundle.items.length} 品）`}
                </button>
              </div>
            );
          })}

          {mealSingles.length > 0 && (
            <div className="rounded-xl border border-dashed border-border p-3">
              <p className="text-xs font-semibold text-text-muted">
                未分組單品（舊資料）
              </p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                這些沒有套餐名稱。之後加入常吃時請填套餐名，才會歸在上方套餐。
              </p>
              <div className="mt-2 space-y-1.5">
                {mealSingles.map((fav) => (
                  <div
                    key={fav.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg-app px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">
                        {fav.name}
                      </p>
                      <p className="text-[11px] tabular-nums text-text-muted">
                        {fav.calories} kcal · P{fav.proteinG}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        disabled={addingKey === fav.id}
                        onClick={() => void addSingle(fav)}
                        className="rounded-lg bg-accent/15 px-2 py-1 text-[11px] font-bold text-accent-light disabled:opacity-40"
                      >
                        新增
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingSingle(fav)}
                        className="rounded-lg border border-border px-2 py-1 text-[11px] text-text-muted"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {pendingBundle && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div
            role="dialog"
            className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-4"
          >
            <h3 className="text-sm font-bold text-accent-light">刪除整份套餐？</h3>
            <p className="mt-2 text-sm text-text-muted">
              確定刪除「{pendingBundle.name}」共 {pendingBundle.items.length}{" "}
              品？此動作無法復原。
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingBundle(null)}
                className="min-h-[44px] flex-1 rounded-xl border border-border bg-bg-elevated text-sm"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteBundle()}
                className="min-h-[44px] flex-1 rounded-xl bg-danger text-sm font-bold text-white"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingSingle && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div
            role="dialog"
            className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-4"
          >
            <h3 className="text-sm font-bold text-accent-light">刪除單品？</h3>
            <p className="mt-2 text-sm text-text-muted">
              確定要刪除「{pendingSingle.name}」嗎？此動作無法復原。
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingSingle(null)}
                className="min-h-[44px] flex-1 rounded-xl border border-border bg-bg-elevated text-sm"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  void onDelete(pendingSingle.id);
                  setPendingSingle(null);
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
