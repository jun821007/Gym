"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TabNav } from "@/components/layout/TabNav";
import type { TabId } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AppBottomBarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  swipeTabsEnabled: boolean;
  onSwipeTabsEnabledChange: (enabled: boolean) => void;
}

export function AppBottomBar({
  active,
  onChange,
  swipeTabsEnabled,
  onSwipeTabsEnabledChange,
}: AppBottomBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const bar = (
    <footer className="app-bottom-bar">
      <div className="app-bottom-bar-inner">
        {settingsOpen && (
          <div className="mb-2 rounded-xl border border-border bg-bg-elevated px-3 py-2">
            <label className="flex items-center justify-between gap-3 text-sm text-text">
              <span>左右滑動切換頁面</span>
              <button
                type="button"
                role="switch"
                aria-checked={swipeTabsEnabled}
                onClick={() => onSwipeTabsEnabledChange(!swipeTabsEnabled)}
                className={cn(
                  "relative h-7 w-12 shrink-0 rounded-full border-2 border-border transition",
                  swipeTabsEnabled ? "bg-accent" : "bg-bg-app",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-text transition",
                    swipeTabsEnabled ? "left-[1.35rem]" : "left-0.5",
                  )}
                />
              </button>
            </label>
            <p className="mt-1 text-xs text-text-muted">
              關閉時僅能使用下方分頁切換
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <TabNav active={active} onChange={onChange} variant="bottom" />
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-border-pixel text-base",
              settingsOpen
                ? "bg-accent/20 text-accent-light"
                : "bg-bg-elevated text-text-muted",
            )}
            aria-label="導覽設定"
            aria-expanded={settingsOpen}
          >
            ⚙
          </button>
        </div>
      </div>
    </footer>
  );

  if (!mounted) return null;
  return createPortal(bar, document.body);
}
