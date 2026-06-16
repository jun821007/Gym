import type { TabId } from "@/lib/types";

export const TAB_SWIPE_ORDER: TabId[] = ["dungeon", "control", "tavern"];

export const TAB_SWIPE_LABELS: Record<TabId, string> = {
  control: "勇者資訊",
  dungeon: "地下城",
  tavern: "食堂",
};

/** 快速滑動的最小水平位移（px） */
export const SWIPE_MIN_DISTANCE_PX = 88;
/** 較慢拖曳時需滑更遠才切頁 */
export const SWIPE_SLOW_DISTANCE_PX = 128;
/** 超過此時間視為慢拖，改用較大門檻 */
export const SWIPE_MAX_DURATION_MS = 420;
/** 水平位移須明顯大於垂直，避免捲動時誤觸 */
export const SWIPE_HORIZONTAL_RATIO = 2.2;

export function tabIndex(tab: TabId) {
  return TAB_SWIPE_ORDER.indexOf(tab);
}

export function effectiveSwipeThreshold(durationMs: number): number {
  return durationMs > SWIPE_MAX_DURATION_MS
    ? SWIPE_SLOW_DISTANCE_PX
    : SWIPE_MIN_DISTANCE_PX;
}

export function tabBySwipeDelta(
  tab: TabId,
  deltaX: number,
  minDistance = SWIPE_MIN_DISTANCE_PX,
): TabId | null {
  const idx = tabIndex(tab);
  if (idx < 0) return null;
  if (deltaX < -minDistance && idx < TAB_SWIPE_ORDER.length - 1) {
    return TAB_SWIPE_ORDER[idx + 1];
  }
  if (deltaX > minDistance && idx > 0) {
    return TAB_SWIPE_ORDER[idx - 1];
  }
  return null;
}

export function isHorizontalSwipe(
  deltaX: number,
  deltaY: number,
  minDistance = SWIPE_MIN_DISTANCE_PX,
) {
  const absX = Math.abs(deltaX);
  return absX >= minDistance && absX > Math.abs(deltaY) * SWIPE_HORIZONTAL_RATIO;
}
