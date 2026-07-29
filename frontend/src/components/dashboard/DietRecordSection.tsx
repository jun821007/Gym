"use client";

import { useEffect, useMemo, useState } from "react";
import { DietEditModal } from "@/components/dashboard/DietEditModal";
import { Card } from "@/components/ui/Card";
import { formatTime } from "@/lib/datetime";
import { isSameDateKey } from "@/lib/logged-at";
import {
  DEFAULT_WATER_GOAL_ML,
  getWaterEntriesForDate,
  sumWaterMl,
} from "@/lib/water-intake";
import type { DietLog } from "@/lib/types";
import type { WaterLogEntry } from "@/lib/water-intake";

const MEAL_LABEL: Record<NonNullable<DietLog["mealType"]>, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "點心",
};

interface DietRecordSectionProps {
  diets: DietLog[];
  waterLogs: WaterLogEntry[];
  waterGoalMl?: number;
  recordDate: string;
  onWaterSetTotal: (amountMl: number, logDate: string) => void | Promise<void>;
  onDietUpdate: (id: string, log: Omit<DietLog, "id">) => void | Promise<void>;
  onDietDelete: (id: string) => void | Promise<void>;
}

export function DietRecordSection({
  diets,
  waterLogs,
  waterGoalMl = DEFAULT_WATER_GOAL_ML,
  recordDate,
  onWaterSetTotal,
  onDietUpdate,
  onDietDelete,
}: DietRecordSectionProps) {
  const [waterDraft, setWaterDraft] = useState("");
  const [savingWater, setSavingWater] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    kind: "meal";
    item: DietLog;
  } | null>(null);

  const dayMeals = useMemo(
    () =>
      diets
        .filter((d) => isSameDateKey(d.loggedAt, recordDate))
        .sort(
          (a, b) =>
            new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
        ),
    [diets, recordDate],
  );

  const dayWater = useMemo(
    () => getWaterEntriesForDate(waterLogs, recordDate),
    [waterLogs, recordDate],
  );

  const dayWaterMl = useMemo(() => sumWaterMl(dayWater), [dayWater]);

  useEffect(() => {
    setWaterDraft(dayWaterMl > 0 ? String(dayWaterMl) : "");
  }, [dayWaterMl, recordDate]);

  async function handleSaveWater(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(waterDraft);
    if (!Number.isFinite(n) || n < 0) {
      alert("請輸入 0 以上的毫升數");
      return;
    }
    setSavingWater(true);
    try {
      await onWaterSetTotal(Math.round(n), recordDate);
    } catch (err) {
      alert(err instanceof Error ? err.message : "儲存飲水失敗");
    } finally {
      setSavingWater(false);
    }
  }

  return (
    <>
      <Card title="餐點紀錄">
        <form
          onSubmit={(e) => void handleSaveWater(e)}
          className="mb-4 rounded-xl bg-bg-elevated p-3"
        >
          <label className="block text-xs text-text-muted">
            當日飲水（一天結束再記總量即可）
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={20000}
                step={50}
                value={waterDraft}
                onChange={(e) => setWaterDraft(e.target.value)}
                placeholder="例如 2200"
                className="min-h-[44px] flex-1 rounded-lg border border-border bg-bg-app px-3 text-base tabular-nums outline-none focus:border-accent"
              />
              <span className="flex items-center text-sm text-text-muted">
                ml
              </span>
              <button
                type="submit"
                disabled={savingWater}
                className="min-h-[44px] shrink-0 rounded-lg bg-sky-600 px-4 text-sm font-bold text-white disabled:opacity-40"
              >
                {savingWater ? "儲存中…" : "儲存"}
              </button>
            </div>
          </label>
          <p className="mt-1.5 text-[11px] text-text-muted">
            目標 {waterGoalMl} ml
            {dayWaterMl > 0 ? ` · 已存 ${dayWaterMl} ml` : ""}
          </p>
        </form>

        {dayMeals.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            這天還沒有餐點紀錄
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {dayMeals.map((meal) => (
              <li key={meal.id} className="flex gap-3 py-3">
                <time
                  className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-accent"
                  dateTime={meal.loggedAt}
                >
                  {formatTime(meal.loggedAt)}
                </time>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{meal.foodName}</p>
                    {meal.mealType && (
                      <span className="rounded-md bg-bg-elevated px-1.5 py-0.5 text-xs text-text-muted">
                        {MEAL_LABEL[meal.mealType]}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-accent">
                    蛋白質 {meal.proteinG}g
                  </p>
                  <p className="text-xs tabular-nums text-text-muted">
                    {meal.calories} kcal · 碳水 {meal.carbsG}g · 脂肪{" "}
                    {meal.fatG}g · 鈉 {meal.sodiumMg ?? 0}mg
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setEditTarget({ kind: "meal", item: meal })}
                    className="text-xs text-accent-light underline"
                  >
                    編輯
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`刪除「${meal.foodName}」？`)) {
                        void onDietDelete(meal.id);
                      }
                    }}
                    className="text-xs text-danger underline"
                  >
                    刪除
                  </button>
                </div>
              </li>
            ))}
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
    </>
  );
}
