"use client";

import { useState } from "react";
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

  return (
    <footer className="app-bottom-bar">
      {settingsOpen && (
        <div className="app-bottom-bar-settings">
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
        </div>
      )}

      <div className="app-bottom-bar-row">
        <TabNav active={active} onChange={onChange} variant="bottom" />
        <button
          type="button"
          onClick={() => setSettingsOpen((o) => !o)}
          className={cn(
            "app-bottom-bar-gear",
            settingsOpen && "app-bottom-bar-gear--active",
          )}
          aria-label="導覽設定"
          aria-expanded={settingsOpen}
        >
          <span className="app-tab-bottom-icon">⚙</span>
        </button>
      </div>
    </footer>
  );
}
