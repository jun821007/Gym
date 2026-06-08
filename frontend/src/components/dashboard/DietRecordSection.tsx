"use client";

import { useMemo, useState } from "react";
import { DietEditModal } from "@/components/dashboard/DietEditModal";
import { Card } from "@/components/ui/Card";
import { formatTime } from "@/lib/datetime";
import { isSameDateKey } from "@/lib/logged-at";
import {
  DEFAULT_WATER_GOAL_ML,
  WATER_QUICK_ML,
  getWaterEntriesForDate,
  sumWaterMl,
  waterProgressPct,
} from "@/lib/water-intake";
import type { DietLog } from "@/lib/types";
import type { WaterLogEntry } from "@/lib/water-intake";

const MEAL_LABEL: Record<NonNullable<DietLog["mealType"]>, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "點心",
};

type TimelineItem =
  | { kind: "meal"; id: string; loggedAt: string; data: DietLog }
  | { kind: "water"; id: string; loggedAt: string; data: WaterLogEntry };

interface DietRecordSectionProps {
  diets: DietLog[];
  waterLogs: WaterLogEntry[];
  waterGoalMl?: number;
  recordDate: string;
  onWaterAdd: (amountMl: number, logDate: string) => void | Promise<void>;
  onWaterGoalChange: (goalMl: number) => void | Promise<void>;
  onDietUpdate: (id: string, log: Omit<DietLog, "id">) => void | Promise<void>;
  onDietDelete: (id: string) => void | Promise<void>;
  onWaterUpdate: (
    id: string,
    patch: { amountMl: number; logDate: string; loggedAt: string },
  ) => void | Promise<void>;
  onWaterDelete: (id: string) => void | Promise<void>;
}

export function DietRecordSection({
  diets,
  waterLogs,
  waterGoalMl = DEFAULT_WATER_GOAL_ML,
  recordDate,
  onWaterAdd,
  onWaterGoalChange,
  onDietUpdate,
  onDietDelete,
  onWaterUpdate,
  onWaterDelete,
}: DietRecordSectionProps) {
  const [customMl, setCustomMl] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(String(waterGoalMl));
  const [editTarget, setEditTarget] = useState<
    | { kind: "meal"; item: DietLog }
    | { kind: "water"; item: WaterLogEntry }
    | null
  >(null);

  const dayMeals = useMemo(
    () => diets.filter((d) => isSameDateKey(d.loggedAt, recordDate)),
    [diets, recordDate],
  );

  const dayWater = useMemo(
    () => getWaterEntriesForDate(waterLogs, recordDate),
    [waterLogs, recordDate],
  );

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [
      ...dayMeals.map((d) => ({
        kind: "meal" as const,
        id: d.id,
        loggedAt: d.loggedAt,
        data: d,
      })),
      ...dayWater.map((w) => ({
        kind: "water" as const,
        id: w.id,
        loggedAt: w.loggedAt,
        data: w,
      })),
    ];
    return items.sort(
      (a, b) =>
        new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
    );
  }, [dayMeals, dayWater]);

  const dayWaterMl = useMemo(() => sumWaterMl(dayWater), [dayWater]);
  const waterPct = waterProgressPct(dayWaterMl, waterGoalMl);

  async function handleSaveGoal() {
    const n = Number(goalDraft);
    if (!Number.isFinite(n) || n < 500) {
      alert("每日目標請設 500–10000 ml");
      return;
    }
    await onWaterGoalChange(n);
    setEditingGoal(false);
  }

  return (
    <>
      <Card title="餐點紀錄">
        <div className="mb-4 rounded-xl bg-bg-elevated p-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-lg font-bold tabular-nums text-sky-300">
                {dayWaterMl}
                <span className="ml-1 text-sm font-normal text-text-muted">
                  / {waterGoalMl} ml
                </span>
              </p>
              <p className="text-xs text-text-muted">當日飲水 · {waterPct}%</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (editingGoal) void handleSaveGoal();
                else {
                  setGoalDraft(String(waterGoalMl));
                  setEditingGoal(true);
                }
              }}
              className="text-xs text-text-muted underline"
            >
              {editingGoal ? "儲存目標" : "自訂目標"}
            </button>
          </div>
          {editingGoal && (
            <input
              type="number"
              min={500}
              max={10000}
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              className="mt-2 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-3 tabular-nums"
            />
          )}
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {WATER_QUICK_ML.map((ml) => (
              <button
                key={ml}
                type="button"
                onClick={() => void onWaterAdd(ml, recordDate)}
                className="min-h-[36px] rounded-lg border border-border bg-bg-app text-xs font-semibold tabular-nums"
              >
                +{ml}
              </button>
            ))}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(customMl);
              if (Number.isFinite(n) && n > 0) {
                void onWaterAdd(n, recordDate);
                setCustomMl("");
              }
            }}
          >
            <input
              type="number"
              placeholder="自訂 ml"
              value={customMl}
              onChange={(e) => setCustomMl(e.target.value)}
              className="min-h-[40px] flex-1 rounded-lg border border-border bg-bg-app px-3 tabular-nums"
            />
            <button
              type="submit"
              className="min-h-[40px] rounded-lg bg-sky-600 px-3 text-xs font-bold text-white"
            >
              喝水
            </button>
          </form>
        </div>

        {timeline.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            這天還沒有紀錄
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {timeline.map((item) =>
              item.kind === "meal" ? (
                <li key={item.id} className="flex gap-3 py-3">
                  <time
                    className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-accent"
                    dateTime={item.loggedAt}
                  >
                    {formatTime(item.loggedAt)}
                  </time>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.data.foodName}</p>
                      {item.data.mealType && (
                        <span className="rounded-md bg-bg-elevated px-1.5 py-0.5 text-xs text-text-muted">
                          {MEAL_LABEL[item.data.mealType]}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-accent">
                      蛋白質 {item.data.proteinG}g
                    </p>
                    <p className="text-xs tabular-nums text-text-muted">
                      {item.data.calories} kcal · 碳水 {item.data.carbsG}g · 脂肪{" "}
                      {item.data.fatG}g · 鈉 {item.data.sodiumMg ?? 0}mg
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setEditTarget({ kind: "meal", item: item.data })
                      }
                      className="text-xs text-accent-light underline"
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`刪除「${item.data.foodName}」？`)) {
                          void onDietDelete(item.id);
                        }
                      }}
                      className="text-xs text-danger underline"
                    >
                      刪除
                    </button>
                  </div>
                </li>
              ) : (
                <li key={item.id} className="flex gap-3 py-3">
                  <time
                    className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-sky-400"
                    dateTime={item.loggedAt}
                  >
                    {formatTime(item.loggedAt)}
                  </time>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sky-300">
                      💧 喝水 +{item.data.amountMl} ml
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setEditTarget({ kind: "water", item: item.data })
                      }
                      className="text-xs text-accent-light underline"
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("刪除這筆喝水紀錄？")) {
                          void onWaterDelete(item.id);
                        }
                      }}
                      className="text-xs text-danger underline"
                    >
                      刪除
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </Card>

      {editTarget?.kind === "meal" && (
        <DietEditModal
          kind="meal"
          item={editTarget.item}
          onClose={() => setEditTarget(null)}
          onSave={(log) => onDietUpdate(editTarget.item.id, log)}
        />
      )}
      {editTarget?.kind === "water" && (
        <DietEditModal
          kind="water"
          item={editTarget.item}
          onClose={() => setEditTarget(null)}
          onSave={(patch) => onWaterUpdate(editTarget.item.id, patch)}
        />
      )}
    </>
  );
}
