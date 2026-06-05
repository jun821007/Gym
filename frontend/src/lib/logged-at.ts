import { toDateKey } from "@/lib/datetime";

/** 日期 YYYY-MM-DD + 時間 HH:mm → ISO */
export function combineDateAndTime(dateKey: string, timeStr: string): string {
  const [y, mo, d] = dateKey.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0).toISOString();
}

export function extractDateKey(iso: string): string {
  return toDateKey(new Date(iso));
}

export function extractTimeStr(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function nowTimeStr(): string {
  return extractTimeStr(new Date().toISOString());
}

export function isSameDateKey(iso: string, dateKey: string): boolean {
  return extractDateKey(iso) === dateKey;
}
