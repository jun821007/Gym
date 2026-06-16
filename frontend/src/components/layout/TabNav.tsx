"use client";

import type { ReactNode } from "react";
import { PixelHeroIcon } from "@/components/ui/PixelHeroIcon";
import type { TabId } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "control", label: "勇者資訊", icon: <PixelHeroIcon /> },
  { id: "dungeon", label: "地下城", icon: "⚔" },
  { id: "tavern", label: "食堂", icon: "🍽" },
];

interface TabNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  variant?: "inline" | "bottom";
}

export function TabNav({ active, onChange, variant = "inline" }: TabNavProps) {
  const isBottom = variant === "bottom";

  return (
    <nav
      className={cn(
        isBottom ? "app-tab-nav-bottom" : "mb-4 grid grid-cols-3 gap-2",
      )}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            isBottom ? "app-tab-bottom-btn" : "border-4 border-border-pixel py-3 text-[8px]",
            !isBottom &&
              (active === tab.id
                ? "bg-accent-gold text-bg-deep"
                : "bg-bg-panel text-text-muted hover:bg-bg-panel-light"),
            isBottom && active === tab.id && "app-tab-bottom-btn--active",
          )}
        >
          <span
            className={cn(
              "flex items-center justify-center",
              isBottom ? "h-3.5" : "min-h-[1rem] text-base",
              typeof tab.icon === "string" && !isBottom && "text-base",
            )}
          >
            {tab.icon}
          </span>
          {isBottom ? (
            <span className="mt-0.5 leading-none">{tab.label}</span>
          ) : (
            tab.label
          )}
        </button>
      ))}
    </nav>
  );
}
