"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatTime } from "@/lib/datetime";
import {
  DEFAULT_WATER_GOAL_ML,
  WATER_QUICK_ML,
  getTodayWaterEntries,
  sumWaterMl,
  waterProgressPct,
} from "@/lib/water-intake";
import type { WaterLogEntry } from "@/lib/water-intake";
import { cn } from "@/lib/utils";

interface WaterTrackerPanelProps {
  waterGoalMl?: number;
  entries: WaterLogEntry[];
  onAdd: (amountMl: number) => void | Promise<void>;
  onGoalChange: (goalMl: number) => void | Promise<void>;
}

export function WaterTrackerPanel({
  waterGoalMl = DEFAULT_WATER_GOAL_ML,
  entries,
  onAdd,
  onGoalChange,
}: WaterTrackerPanelProps) {
  const [customMl, setCustomMl] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(String(waterGoalMl));

  const todayEntries = useMemo(() => getTodayWaterEntries(entries), [entries]);
  const todayMl = useMemo(() => sumWaterMl(todayEntries), [todayEntries]);
  const pct = waterProgressPct(todayMl, waterGoalMl);
  const goalReached = todayMl >= waterGoalMl;

  async function handleAdd(ml: number) {
    try {
      await onAdd(ml);
      setCustomMl("");
    } catch {
      /* parent handles */
    }
  }

  async function handleSaveGoal() {
    const n = Number(goalDraft);
    if (!Number.isFinite(n) || n < 500) {
      alert("每日目標請設 500–10000 ml");
      return;
    }
    await onGoalChange(n);
    setEditingGoal(false);
  }

  return (
    <Card title="飲水打卡">
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-2xl font-bold tabular-nums text-sky-300">
              {todayMl}
              <span className="ml-1 text-sm font-normal text-text-muted">
                ml
              </span>
            </p>
            <p className="text-xs text-text-muted">
              今日已喝 · 目標 {waterGoalMl} ml
            </p>
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
            className="shrink-0 rounded-lg border border-border bg-bg-elevated px-2.5 py-1.5 text-xs font-semibold text-text-muted active:scale-[0.98]"
          >
            {editingGoal ? "儲存目標" : "自訂目標"}
          </button>
        </div>

        {editingGoal && (
          <label className="flex items-center gap-2 text-sm">
            <span className="shrink-0 text-text-muted">每日</span>
            <input
              type="number"
              inputMode="numeric"
              min={500}
              max={10000}
              step={50}
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              className="min-h-[40px] flex-1 rounded-lg border border-border bg-bg-app px-3 tabular-nums outline-none focus:border-accent"
            />
            <span className="text-text-muted">ml</span>
          </label>
        )}

        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">進度</span>
            <span
              className={cn(
                "tabular-nums font-medium",
                goalReached ? "text-accent-light" : "text-text",
              )}
            >
              {pct}%
              {goalReached && " · 達標"}
            </span>
          </div>
          <div className="nutrient-track">
            <div
              className="nutrient-fill transition-[width] duration-300"
              style={{ width: `${pct}%`, backgroundColor: "#38bdf8" }}
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {WATER_QUICK_ML.map((ml) => (
            <button
              key={ml}
              type="button"
              onClick={() => void handleAdd(ml)}
              className="min-h-[44px] rounded-xl border border-border bg-bg-elevated text-sm font-semibold tabular-nums text-text active:scale-[0.98]"
            >
              +{ml}
            </button>
          ))}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(customMl);
            if (Number.isFinite(n) && n > 0) void handleAdd(n);
          }}
        >
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            placeholder="自訂 ml"
            value={customMl}
            onChange={(e) => setCustomMl(e.target.value)}
            className="min-h-[44px] flex-1 rounded-xl border border-border bg-bg-app px-3 text-base tabular-nums outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!customMl.trim()}
            className="min-h-[44px] shrink-0 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white disabled:opacity-40 active:scale-[0.98]"
          >
            打卡
          </button>
        </form>

        {todayEntries.length > 0 ? (
          <ul className="divide-y divide-border rounded-xl bg-bg-elevated px-3">
            {todayEntries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <time
                  className="tabular-nums text-accent"
                  dateTime={e.loggedAt}
                >
                  {formatTime(e.loggedAt)}
                </time>
                <span className="font-medium tabular-nums text-sky-300">
                  +{e.amountMl} ml
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-xs text-text-muted">
            點快捷或輸入毫升數開始記錄
          </p>
        )}
      </div>
    </Card>
  );
}
