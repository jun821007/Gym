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
      className={cn("grid grid-cols-3 gap-1.5", isBottom ? "mb-0" : "mb-4")}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "border-4 border-border-pixel transition",
            isBottom ? "py-1.5 text-[8px] leading-tight" : "py-3 text-[8px]",
            active === tab.id
              ? "bg-accent-gold text-bg-deep"
              : "bg-bg-panel text-text-muted hover:bg-bg-panel-light",
          )}
        >
          <span
            className={cn(
              "flex min-h-[1rem] items-center justify-center",
              typeof tab.icon === "string" && (isBottom ? "text-sm" : "text-base"),
            )}
          >
            {tab.icon}
          </span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
