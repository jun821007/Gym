"use client";

import type { TabId } from "@/lib/types";

const TITLES: Record<TabId, string> = {
  control: "體態紀錄",
  dungeon: "訓練打卡",
  tavern: "飲食紀錄",
};

interface AppTopBarProps {
  tab: TabId;
  displayName: string;
}

export function AppTopBar({ tab, displayName }: AppTopBarProps) {
  return (
    <header className="shrink-0 border-b border-border px-4 py-3">
      <p className="text-xs text-text-muted">{displayName}</p>
      <h1 className="text-lg font-bold tracking-tight text-text">
        {TITLES[tab]}
      </h1>
    </header>
  );
}
