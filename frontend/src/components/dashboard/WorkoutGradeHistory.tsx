"use client";

import { SettlementGradeCompare } from "@/components/dashboard/SettlementGradeCompare";
import { formatDurationShort, isSameDateKey } from "@/lib/datetime";
import type { DailyWorkoutSettlement, WorkoutLog } from "@/lib/types";

interface WorkoutGradeHistoryProps {
  settlements: DailyWorkoutSettlement[];
  workouts: WorkoutLog[];
  browseDateKey: string;
  onBrowseDateChange: (dateKey: string) => void;
  onSelect: (s: DailyWorkoutSettlement) => void;
  onDelete?: (s: DailyWorkoutSettlement) => void | Promise<void>;
  onRequestSettle?: (dateKey: string) => void | Promise<void>;
  settlePending?: boolean;
}

export function WorkoutGradeHistory({
  settlements,
  workouts,
  browseDateKey,
  onBrowseDateChange,
  onSelect,
  onDelete,
  onRequestSettle,
  settlePending,
}: WorkoutGradeHistoryProps) {
  return (
    <SettlementGradeCompare
      settlements={settlements}
      browseDateKey={browseDateKey}
      onBrowseDateChange={onBrowseDateChange}
      onSelect={onSelect}
      onDelete={onDelete}
      onRequestSettle={onRequestSettle}
      settlePending={settlePending}
      renderSubtitle={(s) => {
        const dayLogs = workouts.filter((w) =>
          isSameDateKey(w.logDate, s.logDate),
        );
        const duration = formatDurationShort(s.durationMinutes);

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
