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
  historyLogs?: DietLog[];
  recordDate: string;
  onQuickAddMany: (logs: Omit<DietLog, "id">[]) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onDeleteMany?: (ids: string[]) => void | Promise<void>;
  onAssignToBundle?: (
    ids: string[],
    patch: {
      bundleName: string;
      defaultMealType: NonNullable<DietLog["mealType"]>;
    },
  ) => void | Promise<void>;
  onRemoveFromBundle?: (ids: string[]) => void | Promise<void>;
}

function resolveMealType(
  fav: FavoriteMeal,
): NonNullable<DietLog["mealType"]> {
  return fav.defaultMealType ?? "lunch";
}

function mealFingerprint(
  name: string,
  calories: number,
  proteinG: number,
) {
  return `${name.trim().toLowerCase()}|${Math.round(calories)}|${Math.round(proteinG)}`;
}

function isHistoryItemId(id: string) {
  return id.startsWith("hist:");
}

export function FavoriteMealsPanel({
  favorites,
  historyLogs = [],
  recordDate,
  onQuickAddMany,
  onDelete,
  onDeleteMany,
  onAssignToBundle,
  onRemoveFromBundle,
}: FavoriteMealsPanelProps) {
  const [mealType, setMealType] = useState<NonNullable<DietLog["mealType"]>>(
    "breakfast",
  );
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [pendingBundle, setPendingBundle] = useState<MealBundle | null>(null);
  const [pendingSingle, setPendingSingle] = useState<FavoriteMeal | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<"existing" | "new">("new");
  const [assignExisting, setAssignExisting] = useState("");
  const [assignNewName, setAssignNewName] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editBusyId, setEditBusyId] = useState<string | null>(null);

  const { bundles } = useMemo(() => {
    const bundleMap = new Map<string, FavoriteMeal[]>();

    for (const fav of favorites) {
      const meal = resolveMealType(fav);
      const name = fav.bundleName?.trim();
      if (!name) continue;
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

    return { bundles: allBundles };
  }, [favorites]);

  const allItems = useMemo(() => {
    const favs = [...favorites].sort((a, b) =>
      a.name.localeCompare(b.name, "zh-TW"),
    );
    const seen = new Set(
      favs.map((f) => mealFingerprint(f.name, f.calories, f.proteinG)),
    );
    const fromHistory: FavoriteMeal[] = [];
    for (const log of historyLogs) {
      const key = mealFingerprint(log.foodName, log.calories, log.proteinG);
      if (seen.has(key)) continue;
      seen.add(key);
      fromHistory.push({
        id: `hist:${log.id}`,
        name: log.foodName,
        calories: log.calories,
        proteinG: log.proteinG,
        carbsG: log.carbsG,
        fatG: log.fatG,
        sodiumMg: log.sodiumMg ?? 0,
        fiberG: log.fiberG ?? 0,
        defaultMealType: log.mealType,
      });
    }
    fromHistory.sort((a, b) => a.name.localeCompare(b.name, "zh-TW"));
    return [...favs, ...fromHistory];
  }, [favorites, historyLogs]);

  const mealBundles = useMemo(
    () => bundles.filter((b) => b.mealType === mealType),
    [bundles, mealType],
  );

  const existingBundleNames = useMemo(
    () => mealBundles.map((b) => b.name),
    [mealBundles],
  );

  const editingBundle = useMemo(() => {
    if (!editingKey) return null;
    const sep = editingKey.indexOf("::");
    if (sep < 0) return null;
    const meal = editingKey.slice(0, sep);
    const name = editingKey.slice(sep + 2);
    return (
      bundles.find((b) => b.mealType === meal && b.name === name) ?? null
    );
  }, [editingKey, bundles]);

  const addableToEditing = useMemo(() => {
    if (!editingBundle) return [];
    const inBundle = new Set(editingBundle.items.map((i) => i.id));
    return allItems.filter((f) => !inBundle.has(f.id));
  }, [editingBundle, allItems]);

  const mealCounts = useMemo(() => {
    const map: Record<string, number> = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0,
    };
    for (const b of bundles) map[b.mealType] += 1;
    return map;
  }, [bundles]);

  if (favorites.length === 0 && historyLogs.length === 0) return null;

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
      if (onRemoveFromBundle) {
        await onRemoveFromBundle(ids);
      } else if (onAssignToBundle) {
        // fallback：清掉套餐名，保留單品
        await onAssignToBundle(ids, {
          bundleName: "",
          defaultMealType: pendingBundle.mealType,
        });
      } else {
        alert("無法解散套餐：缺少更新介面");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "解散套餐失敗");
    } finally {
      setPendingBundle(null);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openAssign(ids?: string[]) {
    if (!onAssignToBundle) return;
    const targetIds = ids ?? [...selectedIds];
    if (targetIds.length === 0) {
      alert("請先勾選要納入套餐的單品");
      return;
    }
    if (ids) setSelectedIds(new Set(ids));
    if (existingBundleNames.length > 0) {
      setAssignMode("existing");
      setAssignExisting(existingBundleNames[0]);
    } else {
      setAssignMode("new");
      setAssignExisting("");
    }
    setAssignNewName("");
    setAssignOpen(true);
  }

  async function submitAssign() {
    if (!onAssignToBundle) return;
    const ids = [...selectedIds];
    if (ids.length === 0) {
      alert("請先勾選要納入套餐的單品");
      return;
    }
    const name =
      assignMode === "existing"
        ? assignExisting.trim()
        : assignNewName.trim();
    if (!name) {
      alert(
        assignMode === "existing"
          ? "請選擇套餐"
          : "請輸入新套餐名稱（例如：增肌早餐）",
      );
      return;
    }
    setAssignSaving(true);
    try {
      await onAssignToBundle(ids, {
        bundleName: name,
        defaultMealType: mealType,
      });
      setSelectedIds(new Set());
      setAssignOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "納入套餐失敗");
    } finally {
      setAssignSaving(false);
    }
  }

  async function removeFromEditing(id: string) {
    if (!onRemoveFromBundle) return;
    setEditBusyId(id);
    try {
      await onRemoveFromBundle([id]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "移出套餐失敗");
    } finally {
      setEditBusyId(null);
    }
  }

  async function addToEditing(id: string) {
    if (!onAssignToBundle || !editingBundle) return;
    setEditBusyId(id);
    try {
      await onAssignToBundle([id], {
        bundleName: editingBundle.name,
        defaultMealType: editingBundle.mealType,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "加入套餐失敗");
    } finally {
      setEditBusyId(null);
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
                onClick={() => {
                  setMealType(tab.value);
                  setSelectedIds(new Set());
                }}
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
          {mealBundles.length === 0 ? (
            <p className="py-3 text-center text-sm text-text-muted">
              此餐期尚無套餐。可從下方「已加入的單品」勾選後納入，或新增餐點時建立套餐。
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
                  <div className="flex shrink-0 gap-1">
                    {(onAssignToBundle || onRemoveFromBundle) && (
                      <button
                        type="button"
                        onClick={() => setEditingKey(key)}
                        className="rounded-lg border border-border px-2 py-1 text-[11px] text-accent-light"
                      >
                        編輯
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPendingBundle(bundle)}
                      className="rounded-lg border border-border px-2 py-1 text-[11px] text-text-muted"
                    >
                      解散套餐
                    </button>
                  </div>
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

          <div className="rounded-xl border border-dashed border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setItemsOpen((o) => !o)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-xs font-semibold text-text-muted">
                  已加入的單品
                  <span className="ml-1 font-normal">
                    ({allItems.length})
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  {itemsOpen
                    ? "含歷史紀錄餐點，可再新增；勾選後可納入套餐"
                    : "點此展開常吃與歷史餐點"}
                </p>
              </button>
              <div className="flex shrink-0 items-center gap-1.5">
                {itemsOpen && onAssignToBundle && (
                  <button
                    type="button"
                    onClick={() => openAssign()}
                    disabled={selectedIds.size === 0}
                    className="rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-[11px] font-semibold text-accent-light disabled:opacity-40"
                  >
                    納入套餐
                    {selectedIds.size > 0 ? `（${selectedIds.size}）` : ""}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setItemsOpen((o) => !o)}
                  className="text-xs text-text-muted"
                >
                  {itemsOpen ? "收起" : "展開"}
                </button>
              </div>
            </div>

            {itemsOpen && (
              <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
                {allItems.map((fav) => {
                  const fromHistory = isHistoryItemId(fav.id);
                  const bundleLabel = fav.bundleName?.trim();
                  return (
                    <div
                      key={fav.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg-app px-2.5 py-1.5"
                    >
                      <label className="flex min-w-0 flex-1 items-center gap-2">
                        {onAssignToBundle && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(fav.id)}
                            onChange={() => toggleSelected(fav.id)}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold">
                            {fav.name}
                          </p>
                          <p className="text-[11px] tabular-nums text-text-muted">
                            {fav.calories} kcal · P{fav.proteinG}
                            {fromHistory
                              ? " · 歷史"
                              : bundleLabel
                                ? ` · ${bundleLabel}`
                                : " · 未入套餐"}
                          </p>
                        </div>
                      </label>
                      <div className="flex shrink-0 gap-1">
                        {onAssignToBundle && (
                          <button
                            type="button"
                            onClick={() => openAssign([fav.id])}
                            className="rounded-lg border border-border px-2 py-1 text-[11px] text-accent-light"
                          >
                            納入
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={addingKey === fav.id}
                          onClick={() => void addSingle(fav)}
                          className="rounded-lg bg-accent/15 px-2 py-1 text-[11px] font-bold text-accent-light disabled:opacity-40"
                        >
                          新增
                        </button>
                        {!fromHistory && (
                          <button
                            type="button"
                            onClick={() => setPendingSingle(fav)}
                            className="rounded-lg border border-border px-2 py-1 text-[11px] text-text-muted"
                          >
                            刪除
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Card>

      {pendingBundle && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <div
            role="dialog"
            className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-4"
          >
            <h3 className="text-sm font-bold text-accent-light">解散套餐？</h3>
            <p className="mt-2 text-sm text-text-muted">
              確定解散「{pendingBundle.name}」？共{" "}
              {pendingBundle.items.length}{" "}
              品會回到「已加入的單品」，不會刪除常吃資料。
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
                確認解散
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
      {editingKey && editingBundle && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/55 px-4 pb-24 pt-8">
          <div
            role="dialog"
            className="flex max-h-[72dvh] w-full max-w-sm flex-col rounded-2xl border border-border bg-bg-card p-4"
          >
            <h3 className="shrink-0 text-sm font-bold text-accent-light">
              編輯套餐「{editingBundle.name}」
            </h3>
            <p className="mt-1 shrink-0 text-xs text-text-muted">
              移出後單品仍在「已加入的單品」；可從下方加入其他常吃／歷史。
            </p>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-0.5">
              <p className="text-xs font-semibold text-text-muted">
                目前品項（{editingBundle.items.length}）
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {editingBundle.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg-elevated px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{item.name}</p>
                      <p className="text-[11px] tabular-nums text-text-muted">
                        {item.calories} kcal · P{item.proteinG}
                      </p>
                    </div>
                    {onRemoveFromBundle && (
                      <button
                        type="button"
                        disabled={editBusyId === item.id}
                        onClick={() => void removeFromEditing(item.id)}
                        className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] text-text-muted disabled:opacity-40"
                      >
                        移出
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {onAssignToBundle && (
                <>
                  <p className="mt-4 text-xs font-semibold text-text-muted">
                    加入單品
                  </p>
                  {addableToEditing.length === 0 ? (
                    <p className="mt-1.5 text-xs text-text-muted">
                      沒有可加入的其他常吃單品
                    </p>
                  ) : (
                    <ul className="mt-1.5 space-y-1.5">
                      {addableToEditing.map((fav) => (
                        <li
                          key={fav.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border px-2.5 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">
                              {fav.name}
                            </p>
                            <p className="text-[11px] tabular-nums text-text-muted">
                              {fav.calories} kcal
                              {isHistoryItemId(fav.id)
                                ? " · 歷史"
                                : fav.bundleName?.trim()
                                  ? ` · 目前：${fav.bundleName}`
                                  : " · 未入套餐"}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={editBusyId === fav.id}
                            onClick={() => void addToEditing(fav.id)}
                            className="shrink-0 rounded-lg bg-accent/15 px-2 py-1 text-[11px] font-bold text-accent-light disabled:opacity-40"
                          >
                            加入
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setEditingKey(null)}
              className="mt-3 min-h-[44px] w-full shrink-0 rounded-xl border border-border bg-bg-elevated text-sm font-semibold"
            >
              完成
            </button>
          </div>
        </div>
      )}

      {assignOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/55 p-4">
          <div
            role="dialog"
            className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-4"
          >
            <h3 className="text-sm font-bold text-accent-light">納入套餐</h3>
            <p className="mt-1 text-xs text-text-muted">
              已選 {selectedIds.size} 品，將歸到
              {MEAL_TABS.find((t) => t.value === mealType)?.label}。
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={existingBundleNames.length === 0}
                onClick={() => setAssignMode("existing")}
                className={cn(
                  "min-h-[36px] flex-1 rounded-lg border text-xs font-semibold disabled:opacity-40",
                  assignMode === "existing"
                    ? "border-accent bg-accent/20 text-accent-light"
                    : "border-border text-text-muted",
                )}
              >
                併入既有
              </button>
              <button
                type="button"
                onClick={() => setAssignMode("new")}
                className={cn(
                  "min-h-[36px] flex-1 rounded-lg border text-xs font-semibold",
                  assignMode === "new"
                    ? "border-accent bg-accent/20 text-accent-light"
                    : "border-border text-text-muted",
                )}
              >
                建立新套餐
              </button>
            </div>
            {assignMode === "existing" ? (
              <label className="mt-3 block text-xs text-text-muted">
                選擇套餐
                <select
                  value={assignExisting}
                  onChange={(e) => setAssignExisting(e.target.value)}
                  className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 text-sm"
                >
                  {existingBundleNames.length === 0 ? (
                    <option value="">尚無套餐</option>
                  ) : (
                    existingBundleNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))
                  )}
                </select>
              </label>
            ) : (
              <label className="mt-3 block text-xs text-text-muted">
                新套餐名稱
                <input
                  value={assignNewName}
                  onChange={(e) => setAssignNewName(e.target.value)}
                  className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-3 text-sm"
                  placeholder="例如：增肌早餐"
                />
              </label>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={assignSaving}
                onClick={() => setAssignOpen(false)}
                className="min-h-[44px] flex-1 rounded-xl border border-border bg-bg-elevated text-sm"
              >
                取消
              </button>
              <button
                type="button"
                disabled={assignSaving}
                onClick={() => void submitAssign()}
                className="min-h-[44px] flex-1 rounded-xl bg-accent text-sm font-bold text-bg-app disabled:opacity-50"
              >
                {assignSaving ? "儲存中…" : "確認納入"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
