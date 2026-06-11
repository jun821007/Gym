"use client";

import { SettlementGradeCompare } from "@/components/dashboard/SettlementGradeCompare";
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
