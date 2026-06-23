/** 本地日期的 YYYY-MM-DD */
export function toDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 將 DB / ISO 字串統一成 YYYY-MM-DD，避免含時間時篩選錯位 */
export function normalizeDateKey(value: string | null | undefined): string {
  if (!value) return toDateKey();
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? toDateKey() : toDateKey(d);
}

/** 比對 YYYY-MM-DD；日期字串直接比對，避免 UTC 解析錯位 */
export function isSameDateKey(
  value: string,
  dateKey: string = toDateKey(),
): boolean {
  return normalizeDateKey(value) === normalizeDateKey(dateKey);
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

function splitDurationMinutes(totalMinutes: number): {
  hours: number;
  minutes: number;
} {
  const safe = Math.max(0, totalMinutes);
  const hours = Math.floor(safe / 60);
  const minutes = Math.floor(safe - hours * 60);
  return { hours, minutes };
}

/** 歷史卡片：83.9 分 → 1h23m（避免浮點 % 產生 .900000006） */
export function formatDurationShort(totalMinutes: number): string {
  if (totalMinutes <= 0) return "—";
  const { hours, minutes } = splitDurationMinutes(totalMinutes);
  if (hours > 0) {
    return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`;
  }
  return `${Math.round(totalMinutes)}分`;
}

/** 結算彈窗：83.9 分 → 1:23 */
export function formatDurationClock(totalMinutes: number): string {
  if (totalMinutes <= 0) return "—";
  const { hours, minutes } = splitDurationMinutes(totalMinutes);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}`;
  }
  return `${Math.round(totalMinutes)} 分`;
}

/** 今天 / 昨天 / 6月3日 */
export function formatDateLabel(dateKey: string): string {
  const key = normalizeDateKey(dateKey);
  const today = toDateKey();
  if (key === today) return "今天";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === toDateKey(yesterday)) return "昨天";

  const [y, m, d] = key.split("-").map(Number);
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
    const key = normalizeDateKey(item.logDate);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, group]) => ({ dateKey, items: group }));
}

export function isoWeekDateRange(year: number, weekNumber: number): {
  start: string;
  end: string;
  shortLabel: string;
} {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNumber - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const start = toDateKey(monday);
  const end = toDateKey(sunday);
  const shortLabel = `${monday.getMonth() + 1}/${monday.getDate()}–${sunday.getMonth() + 1}/${sunday.getDate()}`;
  return { start, end, shortLabel };
}

export type IsoWeek = { year: number; weekNumber: number };

/** ISO 週一為起點的週次（year + weekNumber） */
export function getIsoWeek(d = new Date()): IsoWeek {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { year: date.getUTCFullYear(), weekNumber };
}

export function getPreviousIsoWeek(d = new Date()): IsoWeek {
  const prev = new Date(d);
  prev.setDate(prev.getDate() - 7);
  return getIsoWeek(prev);
}

export function stepBackOneIsoWeek(week: IsoWeek): IsoWeek {
  const range = isoWeekDateRange(week.year, week.weekNumber);
  const d = new Date(`${range.start}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return getIsoWeek(d);
}

/** 週日結算本週，其餘日子結算上週（已結束的完整週） */
export function getDefaultWeeklyEvalWeek(d = new Date()): IsoWeek {
  const current = getIsoWeek(d);
  const range = isoWeekDateRange(current.year, current.weekNumber);
  if (toDateKey(d) === range.end) return current;
  return getPreviousIsoWeek(d);
}

/** 僅允許已結束的 ISO 週（含該週週日當天） */
export function canGenerateWeeklyEval(
  year: number,
  weekNumber: number,
  d = new Date(),
): boolean {
  const range = isoWeekDateRange(year, weekNumber);
  const todayKey = toDateKey(d);
  if (todayKey < range.start) return false;
  return todayKey >= range.end;
}

export function hasWeeklyGrade(
  grades: Array<{ year?: number; weekNumber?: number }>,
  week: IsoWeek,
): boolean {
  return grades.some(
    (g) => g.year === week.year && g.weekNumber === week.weekNumber,
  );
}

/** 預設週次之前、最近一筆尚未產生的已結束週（補登用） */
export function findBackfillWeeklyEvalWeek(
  grades: Array<{ year?: number; weekNumber?: number }>,
  d = new Date(),
  lookback = 12,
): IsoWeek | null {
  let cursor = stepBackOneIsoWeek(getDefaultWeeklyEvalWeek(d));
  for (let i = 0; i < lookback; i++) {
    if (
      !hasWeeklyGrade(grades, cursor) &&
      canGenerateWeeklyEval(cursor.year, cursor.weekNumber, d)
    ) {
      return cursor;
    }
    cursor = stepBackOneIsoWeek(cursor);
  }
  return null;
}
