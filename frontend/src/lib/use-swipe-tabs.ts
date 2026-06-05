"use client";

import { useRef } from "react";
import type { TabId } from "@/lib/types";
import { isHorizontalSwipe, tabBySwipeDelta } from "@/lib/tab-swipe";

export function useSwipeTabs(active: TabId, onChange: (tab: TabId) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart(e: React.TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      start.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd(e: React.TouchEvent) {
      const s = start.current;
      start.current = null;
      const t = e.changedTouches[0];
      if (!s || !t) return;

      const deltaX = t.clientX - s.x;
      const deltaY = t.clientY - s.y;
      if (!isHorizontalSwipe(deltaX, deltaY)) return;

      const next = tabBySwipeDelta(active, deltaX);
      if (next && next !== active) onChange(next);
    },
  };
}
