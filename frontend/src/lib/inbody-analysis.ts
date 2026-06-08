import type { InbodyRecord } from "@/lib/types";

export interface MonthlyBodySummary {
  monthKey: string;
  monthLabel: string;
  recordCount: number;
  weightStart: number | null;
  weightEnd: number | null;
  weightDelta: number | null;
  fatStart: number | null;
  fatEnd: number | null;
  fatDelta: number | null;
  muscleStart: number | null;
  muscleEnd: number | null;
  muscleDelta: number | null;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function delta(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return round1(b - a);
}

function fmtDelta(n: number | null, unit: string) {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}${unit}`;
}

export function formatDeltaLine(n: number | null, unit: string) {
  return fmtDelta(n, unit);
}

export function buildMonthlySummaries(
  history: InbodyRecord[],
): MonthlyBodySummary[] {
  const sorted = [...history].sort((a, b) =>
    a.recorded_at.localeCompare(b.recorded_at),
  );
  const byMonth = new Map<string, InbodyRecord[]>();

  for (const r of sorted) {
    const key = r.recorded_at.slice(0, 7);
    const list = byMonth.get(key) ?? [];
    list.push(r);
    byMonth.set(key, list);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, records]) => {
      const first = records[0];
      const last = records[records.length - 1];
      const weightStart = first.weight_kg ?? null;
      const weightEnd = last.weight_kg ?? null;
      const fatStart = first.body_fat_pct ?? null;
      const fatEnd = last.body_fat_pct ?? null;
      const muscleStart = first.skeletal_muscle_kg ?? null;
      const muscleEnd = last.skeletal_muscle_kg ?? null;

      return {
        monthKey,
        monthLabel: `${monthKey.slice(0, 4)}年${Number(monthKey.slice(5))}月`,
        recordCount: records.length,
        weightStart,
        weightEnd,
        weightDelta: delta(weightStart, weightEnd),
        fatStart,
        fatEnd,
        fatDelta: delta(fatStart, fatEnd),
        muscleStart,
        muscleEnd,
        muscleDelta: delta(muscleStart, muscleEnd),
      };
    });
}
