"use client";

import { formatDateLabel, isToday } from "@/lib/datetime";
import type { DailyWorkoutSettlement, WorkoutLog } from "@/lib/types";
import { cn } from "@/lib/utils";

const GRADE_BADGE: Record<DailyWorkoutSettlement["grade"], string> = {
  S: "bg-accent/30 text-accent-light border-accent-light",
  A: "bg-accent/20 text-accent border-accent",
  B: "bg-sky-500/20 text-sky-300 border-sky-400",
  C: "bg-bg-elevated text-text-muted border-border",
  D: "bg-danger/15 text-danger border-danger",
};

interface WorkoutGradeHistoryProps {
  settlements: DailyWorkoutSettlement[];
  workouts: WorkoutLog[];
  onSelect: (s: DailyWorkoutSettlement) => void;
}

export function WorkoutGradeHistory({
  settlements,
  workouts,
  onSelect,
}: WorkoutGradeHistoryProps) {
  const pastSettlements = settlements.filter((s) => !isToday(s.logDate));

  if (pastSettlements.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-text-muted">
        尚無過往評分，完成結算後會記錄在這裡
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {pastSettlements.map((s) => {
        const dayLogs = workouts.filter((w) => w.logDate === s.logDate);
        const hours = Math.floor(s.durationMinutes / 60);
        const mins = s.durationMinutes % 60;
        const duration =
          hours > 0
            ? `${hours}h${mins}m`
            : s.durationMinutes > 0
              ? `${mins}分`
              : "—";

        return (
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
                  <p className="mt-0.5 truncate text-sm text-text-muted">
                    {s.workoutName}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-text-muted">
                    {duration}
                    {s.activeCalories > 0 && ` · ${s.activeCalories} 大卡`}
                    {dayLogs.length > 0 && ` · ${dayLogs.length} 項重訓`}
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
        );
      })}
    </ul>
  );
}
