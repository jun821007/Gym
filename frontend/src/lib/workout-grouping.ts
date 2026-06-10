import type { WorkoutLog } from "@/lib/types";
import { normalizeSetDetails } from "@/lib/workout-volume";

export interface WorkoutExerciseGroup {
  exerciseName: string;
  logs: WorkoutLog[];
  totalSets: number;
}

export function countLogSets(log: WorkoutLog): number {
  const sets = normalizeSetDetails(log);
  return sets.length || log.sets || 0;
}

export function countWorkoutSets(logs: WorkoutLog[]): number {
  return logs.reduce((sum, log) => sum + countLogSets(log), 0);
}

/** 依動作名稱分組，保留首次出現順序 */
export function groupWorkoutsByExercise(
  workouts: WorkoutLog[],
): WorkoutExerciseGroup[] {
  const order: string[] = [];
  const map = new Map<string, WorkoutLog[]>();

  for (const w of workouts) {
    if (!map.has(w.exerciseName)) order.push(w.exerciseName);
    const list = map.get(w.exerciseName) ?? [];
    list.push(w);
    map.set(w.exerciseName, list);
  }

  return order.map((exerciseName) => {
    const logs = [...(map.get(exerciseName) ?? [])].sort(
      (a, b) =>
        new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
    );
    return {
      exerciseName,
      logs,
      totalSets: countWorkoutSets(logs),
    };
  });
}
