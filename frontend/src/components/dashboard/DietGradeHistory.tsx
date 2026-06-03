"use client";

import { formatDateLabel, isToday } from "@/lib/datetime";
import type { DailyDietSettlement } from "@/lib/types";
import { cn } from "@/lib/utils";

const GRADE_BADGE: Record<DailyDietSettlement["grade"], string> = {
  S: "bg-accent/30 text-accent-light border-accent-light",
  A: "bg-accent/20 text-accent border-accent",
  B: "bg-sky-500/20 text-sky-300 border-sky-400",
  C: "bg-bg-elevated text-text-muted border-border",
  D: "bg-danger/15 text-danger border-danger",
};

interface DietGradeHistoryProps {
  settlements: DailyDietSettlement[];
  onSelect: (s: DailyDietSettlement) => void;
}

export function DietGradeHistory({
  settlements,
  onSelect,
}: DietGradeHistoryProps) {
  const past = settlements.filter((s) => !isToday(s.logDate));

  if (past.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-text-muted">
        尚無過往評分，完成今日結算後會記錄在這裡
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {past.map((s) => (
        <li key={s.logDate}>
          <button
            type="button"
            onClick={() => onSelect(s)}
            className="w-full rounded-xl border border-border bg-bg-elevated p-3 text-left active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center border-[3px] border-solid font-pixel text-2xl",
                  GRADE_BADGE[s.grade],
                )}
              >
                {s.grade}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text">
                  {formatDateLabel(s.logDate)}
                  <span className="ml-2 text-xs font-normal text-text-muted">
                    {s.logDate}
                  </span>
                </p>
                <p className="mt-0.5 text-sm tabular-nums text-text-muted">
                  {s.mealCount} 餐 · {s.totals.calories} kcal · 水{" "}
                  {s.waterMl}ml
                </p>
              </div>
              <span className="text-xs text-accent-light">查看</span>
            </div>
            {s.summary && (
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-text-muted">
                {s.summary}
              </p>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
