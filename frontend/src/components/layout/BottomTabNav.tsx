"use client";

import type { TabId } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "control", label: "體態", icon: "◆" },
  { id: "dungeon", label: "訓練", icon: "⚔" },
  { id: "tavern", label: "飲食", icon: "♨" },
];

interface BottomTabNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function BottomTabNav({ active, onChange }: BottomTabNavProps) {
  return (
    <nav className="bottom-nav" aria-label="主選單">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex min-h-[52px] flex-col items-center justify-center gap-1 border-[3px] border-solid border-transparent text-sm font-semibold transition active:translate-y-0.5",
              isActive
                ? "border-border-pixel bg-accent text-bg-app shadow-[2px_2px_0_#0d0d1a]"
                : "text-text-muted",
            )}
          >
            <span className="text-lg leading-none" aria-hidden>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
