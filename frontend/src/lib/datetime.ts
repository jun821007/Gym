/** 本地日期的 YYYY-MM-DD */
export function toDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 比對 YYYY-MM-DD；日期字串直接比對，避免 UTC 解析錯位 */
export function isSameDateKey(
  value: string,
  dateKey: string = toDateKey(),
): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value === dateKey;
  }
  return toDateKey(new Date(value)) === dateKey;
}

export function isToday(value: string): boolean {
  return isSameDateKey(value);
}

export function yesterdayDateKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateKey(d);
}

export function isYesterday(value: string): boolean {
  return isSameDateKey(value, yesterdayDateKey());
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** 今天 / 昨天 / 6月3日 */
export function formatDateLabel(dateKey: string): string {
  const today = toDateKey();
  if (dateKey === today) return "今天";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === toDateKey(yesterday)) return "昨天";

  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(y, m - 1, d));
}

export function sortByLoggedAtDesc<T extends { loggedAt: string }>(
  items: T[],
): T[] {
  return [...items].sort(
    (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
  );
}

export function groupByDateKey<T extends { logDate: string }>(
  items: T[],
): { dateKey: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.logDate) ?? [];
    list.push(item);
    map.set(item.logDate, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, group]) => ({ dateKey, items: group }));
}
