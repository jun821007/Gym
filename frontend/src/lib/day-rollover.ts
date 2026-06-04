/** 凌晨 0:00–4:59 記錄時詢問算今天還是昨天（方案 2） */
export function shouldPromptDayRollover(date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= 0 && hour < 5;
}

export function buildLoggedAtIso(
  choice: "today" | "yesterday",
  now = new Date(),
): string {
  if (choice === "today") return now.toISOString();
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return d.toISOString();
}

export function formatRolloverPromptTime(date = new Date()): string {
  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
