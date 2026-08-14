"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  collectWorkoutCategories,
  normalizeWorkoutCategory,
  workoutCategoryLabel,
  WORKOUT_CATEGORY_OPTIONS,
} from "@/lib/workout-categories";
import type {
  FavoriteWorkout,
  FavoriteWorkoutExercise,
  WorkoutCategory,
  WorkoutLoadType,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { LOAD_TYPE_OPTIONS } from "@/lib/workout-volume";

interface FavoriteWorkoutsPanelProps {
  favorites: FavoriteWorkout[];
  onApply: (fav: FavoriteWorkout) => void;
  onDelete: (id: string) => void | Promise<void>;
  onCreate?: (fav: {
    name: string;
    category: WorkoutCategory;
    exercises: FavoriteWorkoutExercise[];
    kind?: "exercise";
  }) => void | Promise<void>;
  onUpdate?: (
    id: string,
    patch: {
      name?: string;
      category?: WorkoutCategory | null;
      exercises?: FavoriteWorkoutExercise[];
    },
  ) => void | Promise<void>;
  defaultOpen?: boolean;
}

export function FavoriteWorkoutsPanel({
  favorites,
  onApply,
  onDelete,
  onCreate,
  onUpdate,
  defaultOpen = false,
}: FavoriteWorkoutsPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [activeCategory, setActiveCategory] = useState<WorkoutCategory>("back");
  const [selectedId, setSelectedId] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<FavoriteWorkout | null>(null);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<WorkoutCategory>("back");
  const [newLoadType, setNewLoadType] = useState<WorkoutLoadType>("bilateral");
  const [customCategory, setCustomCategory] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<WorkoutCategory>("back");
  const [editLoadType, setEditLoadType] = useState<WorkoutLoadType>("bilateral");
  const [editCustomCategory, setEditCustomCategory] = useState("");

  const exerciseFavorites = useMemo(
    () => favorites.filter((f) => (f.kind ?? "exercise") !== "menu"),
    [favorites],
  );

  const categories = useMemo(
    () => collectWorkoutCategories(exerciseFavorites),
    [exerciseFavorites],
  );

  const pending = exerciseFavorites.find((f) => f.id === pendingDeleteId);

  const grouped = useMemo(() => {
    const map = new Map<string, FavoriteWorkout[]>();
    for (const cat of categories) map.set(cat, []);
    for (const fav of exerciseFavorites) {
      const cat = fav.category?.trim() || "";
      const list = map.get(cat) ?? [];
      list.push(fav);
      map.set(cat, list);
    }
    return map;
  }, [exerciseFavorites, categories]);

  const activeItems = grouped.get(activeCategory) ?? [];
  const totalCount = exerciseFavorites.length;
  const summaryParts = categories
    .filter((cat) => (grouped.get(cat)?.length ?? 0) > 0)
    .map((cat) => `${workoutCategoryLabel(cat)}(${grouped.get(cat)?.length})`);

  const selected = activeItems.find((f) => f.id === selectedId) ?? null;

  function resolveCategoryInput(
    selectedCat: string,
    custom: string,
  ): WorkoutCategory | null {
    if (selectedCat === "__custom__") {
      return normalizeWorkoutCategory(custom);
    }
    return normalizeWorkoutCategory(selectedCat);
  }

  async function submitCreate() {
    if (!onCreate) return;
    const name = newName.trim();
    if (!name) {
      alert("請輸入動作名稱");
      return;
    }
    const category = resolveCategoryInput(newCategory, customCategory);
    if (!category) {
      alert("請選擇或輸入分類");
      return;
    }
    setCreating(true);
    try {
      await onCreate({
        name,
        category,
        kind: "exercise",
        exercises: [{ exerciseName: name, loadType: newLoadType }],
      });
      setNewName("");
      setNewCategory(category === customCategory.trim() ? "__custom__" : category);
      setCustomCategory("");
      setNewLoadType("bilateral");
      setShowCreate(false);
      setActiveCategory(category);
    } catch (e) {
      alert(e instanceof Error ? e.message : "新增常用訓練失敗");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(fav: FavoriteWorkout) {
    const cat = fav.category?.trim() || "back";
    const isCustom = !WORKOUT_CATEGORY_OPTIONS.some((o) => o.value === cat);
    setEditing(fav);
    setEditName(fav.name);
    setEditCategory(isCustom ? "__custom__" : cat);
    setEditCustomCategory(isCustom ? cat : "");
    setEditLoadType(fav.exercises[0]?.loadType ?? "bilateral");
  }

  async function submitEdit() {
    if (!editing || !onUpdate) return;
    const name = editName.trim();
    if (!name) {
      alert("請輸入動作名稱");
      return;
    }
    const category = resolveCategoryInput(editCategory, editCustomCategory);
    if (!category) {
      alert("請選擇或輸入分類");
      return;
    }
    setSavingEdit(true);
    try {
      await onUpdate(editing.id, {
        name,
        category,
        exercises: [{ exerciseName: name, loadType: editLoadType }],
      });
      setEditing(null);
      setActiveCategory(category);
      setSelectedId(editing.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "更新失敗");
    } finally {
      setSavingEdit(false);
    }
  }

  function applySelected() {
    if (!selected) {
      alert("請先從下拉選取動作");
      return;
    }
    onApply(selected);
  }

  if (totalCount === 0 && !onCreate) return null;

  const categorySelectOptions = [
    ...categories
      .filter((value) => value)
      .map((value) => ({
        value,
        label: workoutCategoryLabel(value),
      })),
    { value: "__custom__", label: "＋ 新增分類…" },
  ];

  return (
    <>
      <Card>
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setOpen((o) => !o)}
        >
          <div>
            <span className="card-title mb-0">常用訓練</span>
            {open && (
              <p className="mt-1 text-xs text-text-muted">
                {totalCount} 項
                {summaryParts.length > 0 && ` · ${summaryParts.join(" · ")}`}
              </p>
            )}
          </div>
          <span className="text-sm text-text-muted">{open ? "收起" : "展開"}</span>
        </button>

        {open && (
          <div className="mt-3">
            <div className="mb-2 flex justify-end gap-1.5">
              {onCreate && (
                <button
                  type="button"
                  onClick={() => {
                    setNewCategory(activeCategory);
                    setCustomCategory("");
                    setShowCreate(true);
                  }}
                  className="rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent-light"
                >
                  + 新增動作
                </button>
              )}
            </div>

            <div className="mb-2 flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const count = grouped.get(cat)?.length ?? 0;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat);
                      setSelectedId("");
                    }}
                    className={cn(
                      "min-h-[32px] rounded-lg border px-2.5 text-xs font-semibold",
                      activeCategory === cat
                        ? "border-accent bg-accent/20 text-accent-light"
                        : "border-border bg-bg-elevated text-text-muted",
                    )}
                  >
                    {workoutCategoryLabel(cat)}
                    {count > 0 && (
                      <span className="ml-0.5 opacity-80">({count})</span>
                    )}
                  </button>
                );
              })}
            </div>

            {activeItems.length === 0 ? (
              <p className="py-2 text-center text-xs text-text-muted">
                尚無{workoutCategoryLabel(activeCategory)}常用動作
              </p>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs text-text-muted">
                  選擇動作
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-bg-app px-3 text-sm"
                  >
                    <option value="">請選擇動作</option>
                    {activeItems.map((fav) => (
                      <option key={fav.id} value={fav.id}>
                        {fav.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!selected}
                    onClick={applySelected}
                    className="min-h-[40px] flex-1 rounded-lg bg-accent/20 text-sm font-bold text-accent-light disabled:opacity-40"
                  >
                    帶入表單
                  </button>
                  {onUpdate && (
                    <button
                      type="button"
                      disabled={!selected}
                      onClick={() => selected && openEdit(selected)}
                      className="min-h-[40px] rounded-lg border border-border px-3 text-xs text-text-muted disabled:opacity-40"
                    >
                      編輯
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!selected}
                    onClick={() => selected && setPendingDeleteId(selected.id)}
                    className="min-h-[40px] rounded-lg border border-border px-3 text-xs text-text-muted disabled:opacity-40"
                  >
                    刪除
                  </button>
                </div>
              </div>
            )}
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
                  if (selectedId === pending.id) setSelectedId("");
                }}
                className="min-h-[44px] flex-1 rounded-xl bg-danger text-sm font-bold text-white"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/55 p-4">
          <div
            role="dialog"
            className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-4"
          >
            <h3 className="text-sm font-bold text-accent-light">新增常用動作</h3>
            <div className="mt-3 space-y-2">
              <label className="block text-xs text-text-muted">
                動作名稱
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 text-sm"
                  placeholder="例如：硬舉"
                />
              </label>
              <label className="block text-xs text-text-muted">
                分類
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 text-sm"
                >
                  {categorySelectOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {newCategory === "__custom__" && (
                <label className="block text-xs text-text-muted">
                  新分類名稱
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 text-sm"
                    placeholder="例如：臀部"
                  />
                </label>
              )}
              <label className="block text-xs text-text-muted">
                負載類型
                <select
                  value={newLoadType}
                  onChange={(e) => setNewLoadType(e.target.value as WorkoutLoadType)}
                  className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 text-sm"
                >
                  {LOAD_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={creating}
                onClick={() => setShowCreate(false)}
                className="min-h-[44px] flex-1 rounded-xl border border-border bg-bg-elevated text-sm"
              >
                取消
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={() => void submitCreate()}
                className="min-h-[44px] flex-1 rounded-xl bg-accent text-sm font-bold text-bg-app disabled:opacity-50"
              >
                {creating ? "新增中…" : "確認新增"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/55 p-4">
          <div
            role="dialog"
            className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-4"
          >
            <h3 className="text-sm font-bold text-accent-light">編輯常用動作</h3>
            <div className="mt-3 space-y-2">
              <label className="block text-xs text-text-muted">
                動作名稱
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 text-sm"
                />
              </label>
              <label className="block text-xs text-text-muted">
                分類
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 text-sm"
                >
                  {categorySelectOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {editCategory === "__custom__" && (
                <label className="block text-xs text-text-muted">
                  分類名稱
                  <input
                    type="text"
                    value={editCustomCategory}
                    onChange={(e) => setEditCustomCategory(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 text-sm"
                    placeholder="例如：核心"
                  />
                </label>
              )}
              <label className="block text-xs text-text-muted">
                負載類型
                <select
                  value={editLoadType}
                  onChange={(e) => setEditLoadType(e.target.value as WorkoutLoadType)}
                  className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 text-sm"
                >
                  {LOAD_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={savingEdit}
                onClick={() => setEditing(null)}
                className="min-h-[44px] flex-1 rounded-xl border border-border bg-bg-elevated text-sm"
              >
                取消
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={() => void submitEdit()}
                className="min-h-[44px] flex-1 rounded-xl bg-accent text-sm font-bold text-bg-app disabled:opacity-50"
              >
                {savingEdit ? "儲存中…" : "儲存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
