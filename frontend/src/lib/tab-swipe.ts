import type { TabId } from "@/lib/types";

export const TAB_SWIPE_ORDER: TabId[] = ["control", "dungeon", "tavern"];

export const TAB_SWIPE_LABELS: Record<TabId, string> = {
  control: "體態",
  dungeon: "訓練",
  tavern: "飲食",
};

const SWIPE_MIN_PX = 56;

export function tabIndex(tab: TabId) {
  return TAB_SWIPE_ORDER.indexOf(tab);
}

export function tabBySwipeDelta(tab: TabId, deltaX: number): TabId | null {
  const idx = tabIndex(tab);
  if (idx < 0) return null;
  if (deltaX < -SWIPE_MIN_PX && idx < TAB_SWIPE_ORDER.length - 1) {
    return TAB_SWIPE_ORDER[idx + 1];
  }
  if (deltaX > SWIPE_MIN_PX && idx > 0) {
    return TAB_SWIPE_ORDER[idx - 1];
  }
  return null;
}

export function isHorizontalSwipe(deltaX: number, deltaY: number) {
  return Math.abs(deltaX) >= SWIPE_MIN_PX && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;
}
