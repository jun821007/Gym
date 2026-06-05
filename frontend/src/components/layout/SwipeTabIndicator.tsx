"use client";

import type { TabId } from "@/lib/types";
import { TAB_SWIPE_LABELS, TAB_SWIPE_ORDER } from "@/lib/tab-swipe";
import { cn } from "@/lib/utils";

interface SwipeTabIndicatorProps {
  active: TabId;
}

export function SwipeTabIndicator({ active }: SwipeTabIndicatorProps) {
  return (
    <div className="swipe-tab-indicator" aria-live="polite">
      <p className="swipe-tab-indicator__label">{TAB_SWIPE_LABELS[active]}</p>
      <div className="swipe-tab-indicator__dots" aria-hidden>
        {TAB_SWIPE_ORDER.map((id) => (
          <span
            key={id}
            className={cn(
              "swipe-tab-indicator__dot",
              id === active && "swipe-tab-indicator__dot--active",
            )}
          />
        ))}
      </div>
      <p className="swipe-tab-indicator__hint">左右滑動切換</p>
    </div>
  );
}
