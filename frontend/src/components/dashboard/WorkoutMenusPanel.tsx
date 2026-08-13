"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/Card";
import type { FavoriteWorkout } from "@/lib/types";

interface WorkoutMenusPanelProps {
  menus: FavoriteWorkout[];
  onApplyMenu: (menu: FavoriteWorkout) => void;
  onDelete: (id: string) => void | Promise<void>;
  onRename?: (id: string, name: string) => void | Promise<void>;
  defaultOpen?: boolean;
}

export function WorkoutMenusPanel({
  menus,
  onApplyMenu,
  onDelete,
  onRename,
  defaultOpen = true,
}: WorkoutMenusPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [pendingDelete, setPendingDelete] = useState<FavoriteWorkout | null>(
    null,
  );
  const [renaming, setRenaming] = useState<FavoriteWorkout | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  const sorted = useMemo(
    () => [...menus].filter((m) => (m.kind ?? "exercise") === "menu"),
    [menus],
  );

  function openRename(menu: FavoriteWorkout) {
    setRenaming(menu);
    setRenameDraft(menu.name);
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
              {sorted.length} 份 · 點選後依序帶入全部動作
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
                  onClick={() => onApplyMenu(menu)}
                  className="min-w-0 flex-1 text-left active:scale-[0.99]"
                >
                  <p className="text-sm font-semibold text-accent-light">
                    {menu.name}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {menu.exercises.length} 個動作 · 點選開始依序打卡
                  </p>
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
            ))}
          </div>
        )}
      </Card>

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
