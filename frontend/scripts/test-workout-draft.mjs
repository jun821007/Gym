/**
 * 簡易草稿模組測試（不依賴 vitest）
 * 用法：node scripts/test-workout-draft.mjs
 */
import assert from "node:assert/strict";

const WORKOUT_DRAFT_KEY = "gym-workout-form-draft";
const WORKOUT_DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

function draftHasSession(draft) {
  if (!draft) return false;
  return Boolean(draft.exerciseName?.trim()) || draft.menuQueue != null;
}

function isWorkoutDraftFresh(draft, now = Date.now()) {
  if (!draft) return false;
  return now - draft.updatedAt <= WORKOUT_DRAFT_MAX_AGE_MS;
}

function clearWorkoutDraft(storage) {
  storage.removeItem(WORKOUT_DRAFT_KEY);
}

function saveWorkoutDraft(draft, storage) {
  if (!draftHasSession(draft)) {
    clearWorkoutDraft(storage);
    return;
  }
  storage.setItem(
    WORKOUT_DRAFT_KEY,
    JSON.stringify({ ...draft, version: 1, updatedAt: Date.now() }),
  );
}

function loadWorkoutDraft(storage) {
  const raw = storage.getItem(WORKOUT_DRAFT_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (parsed.version !== 1) return null;
  if (!isWorkoutDraftFresh(parsed)) {
    clearWorkoutDraft(storage);
    return null;
  }
  if (!draftHasSession(parsed)) {
    clearWorkoutDraft(storage);
    return null;
  }
  return parsed;
}

function patchWorkoutDraft(patch, storage) {
  const prev = loadWorkoutDraft(storage);
  const next = {
    version: 1,
    updatedAt: Date.now(),
    dateKey: patch.dateKey ?? prev?.dateKey ?? "2026-11-04",
    exerciseName: patch.exerciseName ?? prev?.exerciseName ?? "",
    loadType: patch.loadType ?? prev?.loadType ?? "bilateral",
    weightKg: patch.weightKg ?? prev?.weightKg ?? "",
    extraWeightKg: patch.extraWeightKg ?? prev?.extraWeightKg ?? "",
    assistKg: patch.assistKg ?? prev?.assistKg ?? "",
    setRows: patch.setRows ?? prev?.setRows ?? [
      { reps: "", weightKg: "", strap: false, belt: false, knee: false, wrist: false },
    ],
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

const storage = createMemoryStorage();

// 1) 表單草稿可存可讀
patchWorkoutDraft(
  {
    dateKey: "2026-11-04",
    exerciseName: "硬舉",
    loadType: "bilateral",
    weightKg: "",
    setRows: [
      {
        reps: "5",
        weightKg: "100",
        strap: true,
        belt: false,
        knee: false,
        wrist: false,
      },
    ],
  },
  storage,
);
let draft = loadWorkoutDraft(storage);
assert.equal(draft.exerciseName, "硬舉");
assert.equal(draft.setRows[0].weightKg, "100");
assert.equal(draft.setRows[0].strap, true);

// 2) 只更新菜單進度時不丟掉重量
patchWorkoutDraft(
  {
    menuQueue: {
      name: "拉背日",
      index: 1,
      exercises: [
        { exerciseName: "引體", loadType: "weighted_bw", sets: 3 },
        { exerciseName: "划船", loadType: "bilateral", sets: 3 },
      ],
    },
  },
  storage,
);
draft = loadWorkoutDraft(storage);
assert.equal(draft.exerciseName, "硬舉");
assert.equal(draft.setRows[0].weightKg, "100");
assert.equal(draft.menuQueue.name, "拉背日");
assert.equal(draft.menuQueue.index, 1);

// 3) 清表單欄位但保留菜單
patchWorkoutDraft(
  {
    exerciseName: "",
    setRows: [
      {
        reps: "",
        weightKg: "",
        strap: false,
        belt: false,
        knee: false,
        wrist: false,
      },
    ],
  },
  storage,
);
draft = loadWorkoutDraft(storage);
assert.equal(draft.exerciseName, "");
assert.ok(draft.menuQueue);
assert.equal(draft.menuQueue.index, 1);

// 4) 過期草稿應被丟棄
saveWorkoutDraft(
  {
    version: 1,
    updatedAt: Date.now() - WORKOUT_DRAFT_MAX_AGE_MS - 1000,
    dateKey: "2026-11-04",
    exerciseName: "舊的",
    loadType: "bilateral",
    weightKg: "",
    extraWeightKg: "",
    assistKg: "",
    setRows: [
      {
        reps: "10",
        weightKg: "40",
        strap: false,
        belt: false,
        knee: false,
        wrist: false,
      },
    ],
    menuQueue: null,
  },
  storage,
);
// 手動寫入過期時間
storage.setItem(
  WORKOUT_DRAFT_KEY,
  JSON.stringify({
    version: 1,
    updatedAt: Date.now() - WORKOUT_DRAFT_MAX_AGE_MS - 1000,
    dateKey: "2026-11-04",
    exerciseName: "舊的",
    loadType: "bilateral",
    weightKg: "",
    extraWeightKg: "",
    assistKg: "",
    setRows: [
      {
        reps: "10",
        weightKg: "40",
        strap: false,
        belt: false,
        knee: false,
        wrist: false,
      },
    ],
    menuQueue: null,
  }),
);
assert.equal(loadWorkoutDraft(storage), null);

// 5) 兩者都空 → 清除
patchWorkoutDraft(
  {
    exerciseName: "暫存",
    menuQueue: { name: "A", index: 0, exercises: [{ exerciseName: "x", loadType: "bilateral" }] },
  },
  storage,
);
assert.ok(loadWorkoutDraft(storage));
patchWorkoutDraft({ exerciseName: "", menuQueue: null }, storage);
assert.equal(loadWorkoutDraft(storage), null);

console.log("workout-draft tests: OK");
