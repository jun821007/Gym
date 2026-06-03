"use client";

import type { TabId } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "control", label: "數據艙", icon: "🛸" },
  { id: "dungeon", label: "地下城", icon: "⚔" },
  { id: "tavern", label: "補給酒館", icon: "🍺" },
];

interface TabNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function TabNav({ active, onChange }: TabNavProps) {
  return (
    <nav className="mb-4 grid grid-cols-3 gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "border-4 border-border-pixel py-3 text-[8px] transition",
            active === tab.id
              ? "bg-accent-gold text-bg-deep"
              : "bg-bg-panel text-text-muted hover:bg-bg-panel-light",
          )}
        >
          <span className="block text-base">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
