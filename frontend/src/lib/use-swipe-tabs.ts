"use client";

import { useRef } from "react";
import type { TabId } from "@/lib/types";
import {
  effectiveSwipeThreshold,
  isHorizontalSwipe,
  tabBySwipeDelta,
} from "@/lib/tab-swipe";

const COOLDOWN_MS = 450;

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, label, [role="button"], [role="dialog"], [data-no-tab-swipe]';

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest(INTERACTIVE_SELECTOR);
}

interface UseSwipeTabsOptions {
  /** 鍵盤開啟或 modal 時可設 false */
  enabled?: boolean;
}

export function useSwipeTabs(
  active: TabId,
  onChange: (tab: TabId) => void,
  options?: UseSwipeTabsOptions,
) {
  const start = useRef<{
    x: number;
    y: number;
    t: number;
    fromInteractive: boolean;
  } | null>(null);
  const lastSwitchAt = useRef(0);

  return {
    onTouchStart(e: React.TouchEvent) {
      if (options?.enabled === false) return;
      const t = e.touches[0];
      if (!t) return;
      start.current = {
        x: t.clientX,
        y: t.clientY,
        t: Date.now(),
        fromInteractive: isInteractiveTarget(e.target),
      };
    },
    onTouchEnd(e: React.TouchEvent) {
      if (options?.enabled === false) return;
      if (document.documentElement.classList.contains("keyboard-open")) return;

      const s = start.current;
      start.current = null;
      const t = e.changedTouches[0];
      if (!s || !t || s.fromInteractive) return;

      const now = Date.now();
      if (now - lastSwitchAt.current < COOLDOWN_MS) return;

      const deltaX = t.clientX - s.x;
      const deltaY = t.clientY - s.y;
      const durationMs = now - s.t;
      const threshold = effectiveSwipeThreshold(durationMs);

      if (!isHorizontalSwipe(deltaX, deltaY, threshold)) return;

      const next = tabBySwipeDelta(active, deltaX, threshold);
      if (next && next !== active) {
        lastSwitchAt.current = now;
        onChange(next);
      }
    },
  };
}
