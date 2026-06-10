"use client";

import { SettlementGradeCompare } from "@/components/dashboard/SettlementGradeCompare";
import type { DailyWorkoutSettlement, WorkoutLog } from "@/lib/types";

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
  return (
    <SettlementGradeCompare
      settlements={settlements}
      onSelect={onSelect}
      renderSubtitle={(s) => {
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
          <>
            {duration}
            {s.activeCalories > 0 && ` · ${s.activeCalories} 大卡`}
            {dayLogs.length > 0 && ` · ${dayLogs.length} 項重訓`}
          </>
        );
      }}
    />
  );
}
