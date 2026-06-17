"use client";

import { useState } from "react";
import { formatTime } from "@/lib/datetime";
import type { WorkoutLog, WorkoutSetDetail } from "@/lib/types";
import { groupWorkoutsByExercise } from "@/lib/workout-grouping";
import {
  formatGear,
  formatKg,
  formatLoadLabel,
  normalizeSetDetails,
  storedSetWeightKg,
} from "@/lib/workout-volume";
import { cn } from "@/lib/utils";

interface WorkoutGroupedListProps {
  workouts: WorkoutLog[];
  bodyWeightKg: number | null;
  onDelete?: (id: string) => void;
  onSelectLog?: (log: WorkoutLog) => void;
}

function formatSetLine(
  log: WorkoutLog,
  set: WorkoutSetDetail,
  setIndex: number,
  bodyWeightKg: number | null,
): string {
  const gear = set.gear?.length ? ` · ${formatGear(set.gear)}` : "";
  if (
    log.loadType === "bodyweight" ||
    log.loadType === "weighted_bw" ||
    log.loadType === "assisted_bw"
  ) {
    return `第${setIndex + 1}組 ${formatLoadLabel(log, bodyWeightKg)} · ${set.reps}次${gear}`;
  }
  const w = storedSetWeightKg(log, set);
  const prefix = log.loadType === "unilateral" ? "單邊 " : "";
  return `第${setIndex + 1}組 ${prefix}${formatKg(w)}kg · ${set.reps}次${gear}`;
}

export function WorkoutGroupedList({
  workouts,
  bodyWeightKg,
  onDelete,
  onSelectLog,
}: WorkoutGroupedListProps) {
  const groups = groupWorkoutsByExercise(workouts);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  function toggle(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (groups.length === 0) return null;

  return (
    <ul className="space-y-2">
      {groups.map((group) => {
        const isOpen = expanded.has(group.exerciseName);
        let setCounter = 0;

        return (
          <li
            key={group.exerciseName}
            className="overflow-hidden rounded-xl border border-border bg-bg-elevated"
          >
            <button
              type="button"
              onClick={() => toggle(group.exerciseName)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left active:bg-bg-app/50"
            >
              <span className="min-w-0 font-medium text-text">
                {isOpen ? "▼" : "▶"} {group.exerciseName}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-accent-light">
                {group.totalSets} 組 · {group.logs.length} 筆
              </span>
            </button>

            {isOpen && (
              <ul className="divide-y divide-border border-t border-border px-3">
                {group.logs.map((log) => {
                  const sets = normalizeSetDetails(log);
                  const baseSetIndex = setCounter;
                  setCounter += sets.length;
                  return (
                    <li key={log.id} className="py-2">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          disabled={!onSelectLog}
                          onClick={() => onSelectLog?.(log)}
                          className={cn(
                            "min-w-0 flex-1 text-left",
                            onSelectLog && "active:opacity-70",
                          )}
                        >
                          <time
                            className="text-xs tabular-nums text-text-muted"
                            dateTime={log.loggedAt}
                          >
                            {formatTime(log.loggedAt)}
                          </time>
                          <ul className="mt-1 space-y-0.5 text-xs text-text-muted">
                            {sets.map((set, setIdx) => {
                              const line = formatSetLine(
                                log,
                                set,
                                baseSetIndex + setIdx,
                                bodyWeightKg,
                              );
                              return (
                                <li key={`${log.id}-${setIdx}`}>{line}</li>
                              );
                            })}
                          </ul>
                        </button>
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(log.id)}
                            className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-text-muted"
                          >
                            刪除
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
