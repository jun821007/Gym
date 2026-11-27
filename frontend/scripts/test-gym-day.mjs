import assert from "node:assert/strict";

function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const GYM_DAY_CUTOFF_HOUR = 4;

function gymDayDateKey(now) {
  const d = new Date(now);
  if (d.getHours() < GYM_DAY_CUTOFF_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  return toDateKey(d);
}

function suggestSettleDateKey(workouts, settlements = [], now = new Date()) {
  const gymDay = gymDayDateKey(now);
  const settled = new Set(settlements.map((s) => s.logDate.slice(0, 10)));
  const hasUnsettled = (key) =>
    workouts.some((w) => w.logDate.slice(0, 10) === key && !settled.has(key));
  if (hasUnsettled(gymDay)) return gymDay;
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const yesterday = toDateKey(y);
  if (hasUnsettled(yesterday)) return yesterday;
  return gymDay;
}

// 11/27 22:00 → 訓練日 11/27
assert.equal(
  gymDayDateKey(new Date("2026-11-27T22:00:00")),
  "2026-11-27",
);

// 11/28 00:30 → 訓練日仍是 11/27
assert.equal(
  gymDayDateKey(new Date("2026-11-28T00:30:00")),
  "2026-11-27",
);

// 11/28 04:00 → 訓練日變 11/28
assert.equal(
  gymDayDateKey(new Date("2026-11-28T04:00:00")),
  "2026-11-28",
);

// 過午夜結算：昨天有未結算紀錄 → 預設昨天
assert.equal(
  suggestSettleDateKey(
    [{ logDate: "2026-11-27" }],
    [],
    new Date("2026-11-28T00:30:00"),
  ),
  "2026-11-27",
);

// 昨天已結算 → 用訓練日（仍是昨天，但已結算則可能落到 gymDay）
assert.equal(
  suggestSettleDateKey(
    [{ logDate: "2026-11-27" }],
    [{ logDate: "2026-11-27" }],
    new Date("2026-11-28T00:30:00"),
  ),
  "2026-11-27",
);

console.log("gym-day tests: OK");
