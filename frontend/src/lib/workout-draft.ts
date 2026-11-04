import type {
  FavoriteWorkoutExercise,
  WorkoutLoadType,
} from "@/lib/types";

export type WorkoutDraftSetRow = {
  reps: string;
  weightKg: string;
  strap: boolean;
  belt: boolean;
  knee: boolean;
  wrist: boolean;
};

export type WorkoutMenuQueueDraft = {
  name: string;
  exercises: FavoriteWorkoutExercise[];
  index: number;
};

export type WorkoutFormDraft = {
  version: 1;
  updatedAt: number;
  dateKey: string;
  exerciseName: string;
  loadType: WorkoutLoadType;
  weightKg: string;
  extraWeightKg: string;
  assistKg: string;
  setRows: WorkoutDraftSetRow[];
  menuQueue: WorkoutMenuQueueDraft | null;
};

export const WORKOUT_DRAFT_KEY = "gym-workout-form-draft";
/** 超過 12 小時的草稿視為過期 */
export const WORKOUT_DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function emptySetRow(): WorkoutDraftSetRow {
  return {
    reps: "",
    weightKg: "",
    strap: false,
    belt: false,
    knee: false,
    wrist: false,
  };
}

function isSetRow(value: unknown): value is WorkoutDraftSetRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.reps === "string" &&
    typeof row.weightKg === "string" &&
    typeof row.strap === "boolean" &&
    typeof row.belt === "boolean" &&
    typeof row.knee === "boolean" &&
    typeof row.wrist === "boolean"
  );
}

function isMenuQueue(value: unknown): value is WorkoutMenuQueueDraft {
  if (!value || typeof value !== "object") return false;
  const q = value as Record<string, unknown>;
  return (
    typeof q.name === "string" &&
    typeof q.index === "number" &&
    Array.isArray(q.exercises)
  );
}

export function draftHasFormContent(draft: WorkoutFormDraft | null): boolean {
  return Boolean(draft?.exerciseName?.trim());
}

export function draftHasSession(draft: WorkoutFormDraft | null): boolean {
  if (!draft) return false;
  return draftHasFormContent(draft) || draft.menuQueue != null;
}

export function isWorkoutDraftFresh(
  draft: WorkoutFormDraft | null,
  now = Date.now(),
): boolean {
  if (!draft) return false;
  if (!Number.isFinite(draft.updatedAt)) return false;
  return now - draft.updatedAt <= WORKOUT_DRAFT_MAX_AGE_MS;
}

export function loadWorkoutDraft(
  storage: Pick<Storage, "getItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): WorkoutFormDraft | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(WORKOUT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkoutFormDraft>;
    if (parsed.version !== 1) return null;
    if (typeof parsed.updatedAt !== "number") return null;
    if (typeof parsed.dateKey !== "string") return null;
    if (typeof parsed.exerciseName !== "string") return null;
    if (typeof parsed.loadType !== "string") return null;
    if (!Array.isArray(parsed.setRows) || !parsed.setRows.every(isSetRow)) {
      return null;
    }
    const menuQueue =
      parsed.menuQueue == null
        ? null
        : isMenuQueue(parsed.menuQueue)
          ? parsed.menuQueue
          : null;
    if (parsed.menuQueue != null && menuQueue == null) return null;

    const draft: WorkoutFormDraft = {
      version: 1,
      updatedAt: parsed.updatedAt,
      dateKey: parsed.dateKey,
      exerciseName: parsed.exerciseName,
      loadType: parsed.loadType as WorkoutLoadType,
      weightKg: typeof parsed.weightKg === "string" ? parsed.weightKg : "",
      extraWeightKg:
        typeof parsed.extraWeightKg === "string" ? parsed.extraWeightKg : "",
      assistKg: typeof parsed.assistKg === "string" ? parsed.assistKg : "",
      setRows: parsed.setRows.length > 0 ? parsed.setRows : [emptySetRow()],
      menuQueue,
    };
    if (!isWorkoutDraftFresh(draft)) {
      clearWorkoutDraft(storage as Storage);
      return null;
    }
    if (!draftHasSession(draft)) {
      clearWorkoutDraft(storage as Storage);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function saveWorkoutDraft(
  draft: WorkoutFormDraft,
  storage: Pick<Storage, "setItem" | "removeItem"> | null = typeof window !==
  "undefined"
    ? window.localStorage
    : null,
): void {
  if (!storage) return;
  if (!draftHasSession(draft)) {
    clearWorkoutDraft(storage as Storage);
    return;
  }
  storage.setItem(
    WORKOUT_DRAFT_KEY,
    JSON.stringify({ ...draft, version: 1, updatedAt: Date.now() }),
  );
}

export function clearWorkoutDraft(
  storage: Pick<Storage, "removeItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): void {
  if (!storage) return;
  storage.removeItem(WORKOUT_DRAFT_KEY);
}

export function patchWorkoutDraft(
  patch: Partial<Omit<WorkoutFormDraft, "version" | "updatedAt">>,
  storage: Storage | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): WorkoutFormDraft | null {
  const prev = loadWorkoutDraft(storage);
  const next: WorkoutFormDraft = {
    version: 1,
    updatedAt: Date.now(),
    dateKey: patch.dateKey ?? prev?.dateKey ?? "",
    exerciseName: patch.exerciseName ?? prev?.exerciseName ?? "",
    loadType: patch.loadType ?? prev?.loadType ?? "bilateral",
    weightKg: patch.weightKg ?? prev?.weightKg ?? "",
    extraWeightKg: patch.extraWeightKg ?? prev?.extraWeightKg ?? "",
    assistKg: patch.assistKg ?? prev?.assistKg ?? "",
    setRows: patch.setRows ?? prev?.setRows ?? [emptySetRow()],
    menuQueue:
      patch.menuQueue !== undefined ? patch.menuQueue : (prev?.menuQueue ?? null),
  };
  if (!draftHasSession(next)) {
    clearWorkoutDraft(storage);
    return null;
  }
  saveWorkoutDraft(next, storage);
  return next;
}

/** 供表單還原：把草稿組別轉成 setDetails */
export function draftSetRowsToDetails(rows: WorkoutDraftSetRow[]) {
  return rows.map((row) => {
    const gear: ("strap" | "belt" | "knee" | "wrist")[] = [];
    if (row.strap) gear.push("strap");
    if (row.belt) gear.push("belt");
    if (row.knee) gear.push("knee");
    if (row.wrist) gear.push("wrist");
    const weight = Number(row.weightKg);
    const reps = Number(row.reps);
    return {
      reps: Number.isFinite(reps) && reps > 0 ? reps : 0,
      weightKg:
        Number.isFinite(weight) && weight > 0 ? weight : undefined,
      gear: gear.length ? gear : undefined,
    };
  });
}
