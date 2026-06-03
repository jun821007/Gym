"use client";

import { cn } from "@/lib/utils";

interface XPBarProps {
  level: number;
  xp: number;
  xpToNext: number;
  pulse?: boolean;
  compact?: boolean;
  className?: string;
}

export function XPBar({
  level,
  xp,
  xpToNext,
  pulse,
  compact = false,
  className,
}: XPBarProps) {
  const pct = Math.min(100, Math.round((xp / xpToNext) * 100));

  return (
    <div className={cn(compact ? "space-y-1" : "space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "font-bold text-accent-light",
            compact ? "text-xs" : "text-pixel-sm",
            pulse && "animate-level-pulse",
          )}
        >
          Lv.{level}
        </span>
        <span
          className={cn(
            "tabular-nums text-text-muted",
            compact ? "text-[10px]" : "text-sm",
          )}
        >
          {xp}/{xpToNext}
        </span>
      </div>
      <div className={cn("pixel-xp-track", compact && "pixel-xp-track--compact")}>
        <div className="pixel-xp-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
