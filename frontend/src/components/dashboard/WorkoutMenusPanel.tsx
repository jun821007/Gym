"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/Card";
import {
  collectWorkoutCategories,
  workoutCategoryLabel,
} from "@/lib/workout-categories";
import type { FavoriteWorkout, FavoriteWorkoutExercise } from "@/lib/types";
import { LOAD_TYPE_OPTIONS } from "@/lib/workout-volume";
import { cn } from "@/lib/utils";

interface WorkoutMenusPanelProps {
  menus: FavoriteWorkout[];
  exerciseFavorites: FavoriteWorkout[];
  onApplyMenu: (menu: FavoriteWorkout) => void;
  onDelete: (id: string) => void | Promise<void>;
  onRename?: (id: string, name: string) => void | Promise<void>;
  onUpdate?: (
    id: string,
    patch: { exercises: FavoriteWorkoutExercise[] },
  ) => void | Promise<void>;
  onCreate?: (fav: Omit<FavoriteWorkout, "id">) => void | Promise<void>;
  defaultOpen?: boolean;
}

function loadTypeLabel(loadType: FavoriteWorkoutExercise["loadType"]) {
  return LOAD_TYPE_OPTIONS.find((o) => o.value === loadType)?.label ?? loadType;
}

function sameExercises(
  a: FavoriteWorkoutExercise[],
  b: FavoriteWorkoutExercise[],
) {
  if (a.length !== b.length) return false;
  return a.every(
    (x, i) =>
      x.exerciseName === b[i]?.exerciseName && x.loadType === b[i]?.loadType,
  );
}

function reorderExercises(
  list: FavoriteWorkoutExercise[],
  from: number,
  to: number,
) {
  if (from === to || from < 0 || to < 0) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function MenuExerciseList({
  exercises,
  disabled,
  onReorder,
}: {
  exercises: FavoriteWorkoutExercise[];
  disabled?: boolean;
  onReorder?: (next: FavoriteWorkoutExercise[]) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(exercises);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const originRef = useRef(exercises);
  const rectsRef = useRef<DOMRect[]>([]);
  const fromRef = useRef<number | null>(null);
  const overRef = useRef<number | null>(null);
  const draftRef = useRef(draft);
  const startY = useRef(0);
  const moved = useRef(false);
  const canDrag = Boolean(onReorder) && !disabled;
  draftRef.current = draft;

  useEffect(() => {
    if (fromRef.current == null) setDraft(exercises);
  }, [exercises]);

  function indexFromY(clientY: number) {
    const rects = rectsRef.current;
    if (rects.length === 0) return 0;
    let next = rects.length - 1;
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (clientY < rect.top + rect.height / 2) {
        next = i;
        break;
      }
    }
    return Math.max(0, Math.min(rects.length - 1, next));
  }

  function onPointerDown(e: ReactPointerEvent<HTMLSpanElement>, index: number) {
    if (!canDrag || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    originRef.current = exercises;
    rectsRef.current = itemRefs.current.map(
      (el) => el?.getBoundingClientRect() ?? new DOMRect(),
    );
    fromRef.current = index;
    overRef.current = index;
    startY.current = e.clientY;
    moved.current = false;
    setDragIndex(index);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLSpanElement>) {
    if (fromRef.current == null) return;
    if (!moved.current && Math.abs(e.clientY - startY.current) < 8) return;
    moved.current = true;
    const nextIndex = indexFromY(e.clientY);
    if (nextIndex === overRef.current) return;
    overRef.current = nextIndex;
    const next = reorderExercises(
      originRef.current,
      fromRef.current,
      nextIndex,
    );
    draftRef.current = next;
    setDraft(next);
    setDragIndex(nextIndex);
  }

  async function finishDrag() {
    if (fromRef.current == null) return;
    const next = draftRef.current;
    fromRef.current = null;
    overRef.current = null;
    setDragIndex(null);
    if (!moved.current || !onReorder || sameExercises(next, exercises)) return;
    try {
      await onReorder(next);
    } catch {
      setDraft(exercises);
    }
  }

  if (exercises.length === 0) {
    return (
      <p className="py-2 text-center text-xs text-text-muted">
        這份菜單沒有動作
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {draft.map((ex, i) => (
        <li
          key={`${ex.exerciseName}-${ex.loadType}-${i}`}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          className={cn(
            "flex items-center gap-2 rounded-lg bg-bg-app px-2.5 py-2",
            dragIndex === i && "ring-1 ring-accent/50 shadow-md",
          )}
        >
          <span className="w-5 shrink-0 text-center text-[11px] tabular-nums text-text-muted">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text">
              {ex.exerciseName}
            </p>
            <p className="text-[11px] text-text-muted">
              {loadTypeLabel(ex.loadType)}
            </p>
          </div>
          {canDrag && (
            <span
              role="button"
              tabIndex={0}
              aria-label="拖曳排序"
              onPointerDown={(e) => onPointerDown(e, i)}
              onPointerMove={onPointerMove}
              onPointerUp={() => void finishDrag()}
              onPointerCancel={() => void finishDrag()}
              className={cn(
                "flex min-h-[36px] min-w-[36px] shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-lg border border-border text-text-muted",
                dragIndex === i && "cursor-grabbing bg-accent/15 text-accent-light",
              )}
            >
              ⋮⋮
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function WorkoutMenusPanel({
  menus,
  exerciseFavorites,
  onApplyMenu,
  onDelete,
  onRename,
  onUpdate,
  onCreate,
  defaultOpen = true,
}: WorkoutMenusPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FavoriteWorkout | null>(
    null,
  );
  const [renaming, setRenaming] = useState<FavoriteWorkout | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [selectedFavIds, setSelectedFavIds] = useState<string[]>([]);
  const [createFilterCat, setCreateFilterCat] = useState<string>("__all__");
  const [creating, setCreating] = useState(false);

  const sorted = useMemo(
    () => [...menus].filter((m) => (m.kind ?? "exercise") === "menu"),
    [menus],
  );

  const pickable = useMemo(
    () => exerciseFavorites.filter((f) => (f.kind ?? "exercise") !== "menu"),
    [exerciseFavorites],
  );

  const pickCategories = useMemo(
    () => collectWorkoutCategories(pickable),
    [pickable],
  );

  const pickableByCat = useMemo(() => {
    const map = new Map<string, FavoriteWorkout[]>();
    for (const cat of pickCategories) map.set(cat, []);
    for (const fav of pickable) {
      const cat = fav.category?.trim() || "";
      const list = map.get(cat) ?? [];
      list.push(fav);
      map.set(cat, list);
    }
    return map;
  }, [pickable, pickCategories]);

  const visiblePickable = useMemo(() => {
    if (createFilterCat === "__all__") return pickable;
    return pickableByCat.get(createFilterCat) ?? [];
  }, [createFilterCat, pickable, pickableByCat]);

  const favById = useMemo(
    () => new Map(pickable.map((f) => [f.id, f])),
    [pickable],
  );

  function openRename(menu: FavoriteWorkout) {
    setRenaming(menu);
    setRenameDraft(menu.name);
  }

  function openCreate() {
    setCreateName("");
    setSelectedFavIds([]);
    setCreateFilterCat("__all__");
    setShowCreate(true);
  }

  function togglePick(id: string) {
    setSelectedFavIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }

  async function submitCreate() {
    if (!onCreate) return;
    const name = createName.trim();
    if (!name) {
      alert("請輸入菜單名稱");
      return;
    }
    if (selectedFavIds.length === 0) {
      alert("請至少勾選一個常用訓練動作");
      return;
    }
    const exercises: FavoriteWorkoutExercise[] = [];
    for (const id of selectedFavIds) {
      const fav = favById.get(id);
      if (!fav) continue;
      const ex = fav.exercises[0];
      exercises.push({
        exerciseName: ex?.exerciseName || fav.name,
        loadType: ex?.loadType ?? "bilateral",
      });
    }
    if (exercises.length === 0) {
      alert("勾選的動作無效，請重試");
      return;
    }
    setCreating(true);
    try {
      await onCreate({
        name,
        kind: "menu",
        exercises,
      });
      setShowCreate(false);
      setCreateName("");
      setSelectedFavIds([]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "新增菜單失敗");
    } finally {
      setCreating(false);
    }
  }

  async function submitRename() {
    if (!renaming || !onRename) return;
    const next = renameDraft.trim();
    if (!next) {
      alert("請輸入菜單名稱");
      return;
    }
    if (next === renaming.name) {
      setRenaming(null);
      return;
    }
    setRenameSaving(true);
    try {
      await onRename(renaming.id, next);
      setRenaming(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "重新命名失敗");
    } finally {
      setRenameSaving(false);
    }
  }

  async function persistOrder(
    menu: FavoriteWorkout,
    next: FavoriteWorkoutExercise[],
  ) {
    if (!onUpdate) return;
    setReorderingId(menu.id);
    try {
      await onUpdate(menu.id, { exercises: next });
    } catch (e) {
      alert(e instanceof Error ? e.message : "調整順序失敗");
      throw e;
    } finally {
      setReorderingId(null);
    }
  }

  if (sorted.length === 0 && !onCreate) return null;

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
            {open && (
              <p className="mt-1 text-xs text-text-muted">
                {sorted.length} 份 · 點開後拖曳排序，帶入後依序打卡
              </p>
            )}
          </div>
          <span className="text-sm text-text-muted">{open ? "收起" : "展開"}</span>
        </button>

        {open && (
          <div className="mt-3 space-y-2">
            {onCreate && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent-light"
                >
                  + 新增菜單
                </button>
              </div>
            )}

            {sorted.length === 0 ? (
              <p className="py-3 text-center text-sm text-text-muted">
                尚無菜單。可勾選常用訓練新增，或從歷史紀錄加入。
              </p>
            ) : (
              sorted.map((menu) => {
                const expanded = expandedId === menu.id;
                const busy = reorderingId === menu.id;
                return (
                  <div
                    key={menu.id}
                    className="rounded-xl border border-border bg-bg-elevated"
                  >
                    <div className="flex items-center gap-2 p-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId((id) =>
                            id === menu.id ? null : menu.id,
                          )
                        }
                        className="min-w-0 flex-1 text-left active:scale-[0.99]"
                      >
                        <p className="text-sm font-semibold text-accent-light">
                          {menu.name}
                        </p>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {menu.exercises.length} 個動作 ·{" "}
                          {expanded ? "點此收合" : "點開拖曳排序"}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => onApplyMenu(menu)}
                        className="min-h-[36px] shrink-0 rounded-lg border border-border px-3 text-xs text-text-muted"
                      >
                        帶入
                      </button>
                      {onRename && (
                        <button
                          type="button"
                          onClick={() => openRename(menu)}
                          className="min-h-[36px] shrink-0 rounded-lg border border-border px-3 text-xs text-text-muted"
                        >
                          改名
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingDelete(menu)}
                        className="min-h-[36px] shrink-0 rounded-lg border border-border px-3 text-xs text-text-muted"
                      >
                        刪除
                      </button>
                    </div>

                    {expanded && (
                      <div className="border-t border-border/60 px-3 py-2">
                        <MenuExerciseList
                          exercises={menu.exercises}
                          disabled={busy}
                          onReorder={
                            onUpdate
                              ? (next) => persistOrder(menu, next)
                              : undefined
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </Card>

      {showCreate &&
        createPortal(
          <div className="fixed inset-0 z-[230] flex items-end justify-center bg-black/55 p-4 sm:items-center">
            <div
              role="dialog"
              className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-2xl border border-border bg-bg-card p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-bold text-accent-light">新增訓練菜單</h3>
              <p className="mt-1 text-xs text-text-muted">
                勾選順序＝帶入順序，之後還可拖曳調整。
              </p>

              <label className="mt-3 block text-xs text-text-muted">
                菜單名稱
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-bg-app px-3 text-sm outline-none focus:border-accent"
                  placeholder="例如：拉背日"
                  autoFocus
                />
              </label>

              {pickable.length === 0 ? (
                <p className="mt-3 py-4 text-center text-sm text-text-muted">
                  尚無常用訓練動作，請先在上方新增。
                </p>
              ) : (
                <>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCreateFilterCat("__all__")}
                      className={cn(
                        "min-h-[32px] rounded-lg border px-2.5 text-xs font-semibold",
                        createFilterCat === "__all__"
                          ? "border-accent bg-accent/20 text-accent-light"
                          : "border-border bg-bg-elevated text-text-muted",
                      )}
                    >
                      全部({pickable.length})
                    </button>
                    {pickCategories.map((cat) => {
                      const count = pickableByCat.get(cat)?.length ?? 0;
                      if (count === 0) return null;
                      return (
                        <button
                          key={cat || "__empty__"}
                          type="button"
                          onClick={() => setCreateFilterCat(cat)}
                          className={cn(
                            "min-h-[32px] rounded-lg border px-2.5 text-xs font-semibold",
                            createFilterCat === cat
                              ? "border-accent bg-accent/20 text-accent-light"
                              : "border-border bg-bg-elevated text-text-muted",
                          )}
                        >
                          {workoutCategoryLabel(cat)}({count})
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-2 text-[11px] text-text-muted">
                    已選 {selectedFavIds.length} 項
                    {selectedFavIds.length > 0 &&
                      `：${selectedFavIds
                        .map((id) => favById.get(id)?.name)
                        .filter(Boolean)
                        .join(" → ")}`}
                  </p>

                  <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
                    {visiblePickable.map((fav) => {
                      const checked = selectedFavIds.includes(fav.id);
                      const order = checked
                        ? selectedFavIds.indexOf(fav.id) + 1
                        : null;
                      const load =
                        fav.exercises[0]?.loadType ?? "bilateral";
                      return (
                        <li key={fav.id}>
                          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-bg-elevated px-2.5 py-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePick(fav.id)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-text">
                                {fav.name}
                              </span>
                              <span className="text-[11px] text-text-muted">
                                {workoutCategoryLabel(fav.category)} ·{" "}
                                {loadTypeLabel(load)}
                              </span>
                            </span>
                            {order != null && (
                              <span className="shrink-0 rounded bg-accent/20 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-accent-light">
                                {order}
                              </span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setShowCreate(false)}
                  className="min-h-[44px] flex-1 rounded-xl border border-border bg-bg-elevated text-sm disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={creating || pickable.length === 0}
                  onClick={() => void submitCreate()}
                  className="min-h-[44px] flex-1 rounded-xl bg-accent text-sm font-bold text-bg-app disabled:opacity-50"
                >
                  {creating ? "新增中…" : "確認新增"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {renaming &&
        createPortal(
          <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/55 p-4">
            <div
              role="dialog"
              className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-bold text-accent-light">重新命名</h3>
              <input
                type="text"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                className="mt-3 min-h-[44px] w-full rounded-xl border border-border bg-bg-app px-3 text-sm outline-none focus:border-accent"
                placeholder="例如：拉背日"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitRename();
                }}
              />
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={renameSaving}
                  onClick={() => setRenaming(null)}
                  className="min-h-[44px] flex-1 rounded-xl border border-border bg-bg-elevated text-sm disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={renameSaving}
                  onClick={() => void submitRename()}
                  className="min-h-[44px] flex-1 rounded-xl bg-accent text-sm font-bold text-bg-app disabled:opacity-50"
                >
                  {renameSaving ? "儲存中…" : "儲存"}
                </button>
              </div>
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
            <h3 className="text-sm font-bold text-accent-light">刪除菜單？</h3>
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
