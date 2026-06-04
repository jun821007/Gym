"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DietGradeHistory } from "@/components/dashboard/DietGradeHistory";
import { DietSettlementModal } from "@/components/dashboard/DietSettlementModal";
import { WaterTrackerPanel } from "@/components/dashboard/WaterTrackerPanel";
import { Card } from "@/components/ui/Card";
import { NutrientBar } from "@/components/ui/NutrientBar";
import {
  formatTime,
  isToday,
  sortByLoggedAtDesc,
} from "@/lib/datetime";
import {
  computeDietSettlement,
  xpForDietGrade,
} from "@/lib/diet-grading";
import { getIsoWeek } from "@/lib/supabase/repository";
import type {
  DailyDietSettlement,
  DailyWorkoutSettlement,
  DietLog,
  UserProfile,
  WeeklyGrade,
} from "@/lib/types";
import {
  getTodayWaterEntries,
  sumWaterMl,
} from "@/lib/water-intake";
import type { WaterLogEntry } from "@/lib/water-intake";
import { cn } from "@/lib/utils";

interface TavernTabProps {
  profile: UserProfile;
  /** 依 InBody 自動建議的說明 */
  nutritionRationale?: string | null;
  diets: DietLog[];
  waterLogs: WaterLogEntry[];
  settlementHistory: DailyDietSettlement[];
  workoutSettlements: DailyWorkoutSettlement[];
  weeklyGrades: WeeklyGrade[];
  onWaterAdd: (amountMl: number) => void | Promise<void>;
  onWaterGoalChange: (goalMl: number) => void | Promise<void>;
  onSettlementSaved: (s: DailyDietSettlement) => void | Promise<void>;
  onWeeklyGradeGenerated: (g: WeeklyGrade) => void | Promise<void>;
  onSettlement?: (data: {
    settlement: DailyDietSettlement;
    xpGained?: number;
  }) => void;
}

const MEAL_LABEL: Record<NonNullable<DietLog["mealType"]>, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "點心",
};

const GRADE_STYLE: Record<WeeklyGrade["grade"], string> = {
  S: "bg-accent/25 text-accent-light",
  A: "bg-accent/20 text-accent",
  B: "bg-blue-500/20 text-blue-300",
  C: "bg-bg-elevated text-text-muted",
};

const GRADE_BADGE: Record<DailyDietSettlement["grade"], string> = {
  S: "bg-accent/30 text-accent-light border-accent-light",
  A: "bg-accent/20 text-accent border-accent",
  B: "bg-sky-500/20 text-sky-300 border-sky-400",
  C: "bg-bg-elevated text-text-muted border-border",
  D: "bg-danger/15 text-danger border-danger",
};

export function TavernTab({
  profile,
  nutritionRationale,
  diets,
  waterLogs,
  settlementHistory,
  workoutSettlements,
  weeklyGrades,
  onWaterAdd,
  onWaterGoalChange,
  onSettlementSaved,
  onWeeklyGradeGenerated,
  onSettlement,
}: TavernTabProps) {
  const sorted = useMemo(() => sortByLoggedAtDesc(diets), [diets]);

  const todayDiets = useMemo(
    () => sorted.filter((d) => isToday(d.loggedAt)),
    [sorted],
  );

  const totals = useMemo(
    () =>
      todayDiets.reduce(
        (acc, d) => ({
          calories: acc.calories + d.calories,
          protein: acc.protein + d.proteinG,
          carbs: acc.carbs + d.carbsG,
          fat: acc.fat + d.fatG,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [todayDiets],
  );

  const [settlement, setSettlement] = useState<DailyDietSettlement | null>(
    null,
  );
  const [showModal, setShowModal] = useState(false);
  const [modalSettlement, setModalSettlement] =
    useState<DailyDietSettlement | null>(null);
  const [coachReply, setCoachReply] = useState("");
  const [settling, setSettling] = useState(false);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [gradesHistoryOpen, setGradesHistoryOpen] = useState(true);

  const waterGoalMl = profile.dailyWaterGoalMl ?? 2000;
  const todayWater = useMemo(
    () => sumWaterMl(getTodayWaterEntries(waterLogs)),
    [waterLogs],
  );

  useEffect(() => {
    const today =
      settlementHistory.find((s) => isToday(s.logDate)) ?? null;
    setSettlement(today);
  }, [settlementHistory]);

  function openSettlementModal(s: DailyDietSettlement, reply = "") {
    setModalSettlement(s);
    setCoachReply(reply);
    setShowModal(true);
  }

  const submitSettlement = useCallback(async () => {
    if (todayDiets.length === 0 && todayWater <= 0) {
      alert("請先記錄今日餐點或飲水打卡，再進行結算");
      return;
    }

    setSettling(true);
    try {
      const payload = {
        goals: {
          calories: profile.dailyCalorieGoal,
          proteinG: profile.dailyProteinGoal,
          carbsG: profile.dailyCarbsGoal,
          fatG: profile.dailyFatGoal,
          waterMl: waterGoalMl,
        },
        totals: {
          calories: totals.calories,
          proteinG: totals.protein,
          carbsG: totals.carbs,
          fatG: totals.fat,
        },
        meals: todayDiets.map((d) => ({
          foodName: d.foodName,
          calories: d.calories,
          proteinG: d.proteinG,
          carbsG: d.carbsG,
          fatG: d.fatG,
          loggedAt: d.loggedAt,
        })),
        waterMl: todayWater,
      };

      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      let s: DailyDietSettlement;
      let reply = "";

      if (apiBase) {
        try {
          const res = await fetch(`${apiBase}/api/diet/settle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (res.ok && data.settlement) {
            s = data.settlement as DailyDietSettlement;
            reply = data.reply ?? "";
          } else {
            throw new Error(data.reply ?? data.error ?? "結算失敗");
          }
        } catch {
          s = computeDietSettlement({
            profile,
            todayMeals: todayDiets,
            waterMl: todayWater,
            waterGoalMl,
          });
          reply = s.summary;
        }
      } else {
        s = computeDietSettlement({
          profile,
          todayMeals: todayDiets,
          waterMl: todayWater,
          waterGoalMl,
        });
        reply = s.summary;
      }

      setSettlement(s);
      await onSettlementSaved(s);
      openSettlementModal(s, reply);

      const xpGained = xpForDietGrade(s.grade);
      onSettlement?.({ settlement: s, xpGained });
    } catch (e) {
      alert(e instanceof Error ? e.message : "結算失敗");
    } finally {
      setSettling(false);
    }
  }, [
    profile,
    todayDiets,
    totals,
    todayWater,
    waterGoalMl,
    onSettlement,
    onSettlementSaved,
  ]);

  const submitWeeklyEval = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const { year, weekNumber } = getIsoWeek();
      const weekLabel = `W${weekNumber}`;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const after = cutoff.toISOString().slice(0, 10);

      const snapshot = {
        diets: diets.filter((d) => d.loggedAt.slice(0, 10) >= after),
        dietSettlements: settlementHistory.filter((s) => s.logDate >= after),
        workoutSettlements: workoutSettlements.filter(
          (s) => s.logDate >= after,
        ),
        waterLogs: waterLogs.filter((w) => w.logDate >= after),
        goals: {
          calories: profile.dailyCalorieGoal,
          protein: profile.dailyProteinGoal,
          waterMl: waterGoalMl,
        },
      };

      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      if (!apiBase) throw new Error("請設定 NEXT_PUBLIC_API_URL");

      const res = await fetch(`${apiBase}/api/weekly/eval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekLabel, snapshot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "週評失敗");

      await onWeeklyGradeGenerated({
        weekLabel,
        grade: data.grade,
        summary: data.summary,
        year,
        weekNumber,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "週評失敗");
    } finally {
      setWeeklyLoading(false);
    }
  }, [
    diets,
    settlementHistory,
    workoutSettlements,
    waterLogs,
    profile,
    waterGoalMl,
    onWeeklyGradeGenerated,
  ]);

  return (
    <div className="space-y-4 pb-2">
      <Card title="今日攝取">
        {nutritionRationale && (
          <p className="mb-3 text-xs leading-relaxed text-text-muted">
            {nutritionRationale}
          </p>
        )}
        <div className="space-y-4">
          <NutrientBar
            label="熱量"
            current={totals.calories}
            goal={profile.dailyCalorieGoal}
            unit=" kcal"
            color="#6ee7a0"
          />
          <NutrientBar
            label="蛋白質"
            current={Math.round(totals.protein)}
            goal={profile.dailyProteinGoal}
            unit="g"
            color="#38b764"
          />
          <NutrientBar
            label="碳水"
            current={Math.round(totals.carbs)}
            goal={profile.dailyCarbsGoal}
            unit="g"
            color="#5b9cf5"
          />
          <NutrientBar
            label="脂肪"
            current={Math.round(totals.fat)}
            goal={profile.dailyFatGoal}
            unit="g"
            color="#e85d75"
          />
        </div>
      </Card>

      <WaterTrackerPanel
        waterGoalMl={waterGoalMl}
        entries={waterLogs}
        onAdd={onWaterAdd}
        onGoalChange={onWaterGoalChange}
      />

      <div className="pixel-card pixel-card--hero">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-pixel-sm font-bold text-accent-light">
              ▶ 今日飲食結算
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              綜合餐點、宏量與飲水達成率評分
            </p>
          </div>
          {settlement && (
            <span
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center border-[4px] border-solid font-pixel text-3xl",
                GRADE_BADGE[settlement.grade],
              )}
            >
              {settlement.grade}
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={settling}
          onClick={() => submitSettlement()}
          className="mt-4 min-h-[48px] w-full border-[3px] border-solid border-border-pixel bg-accent text-base font-bold text-bg-app disabled:opacity-50 active:scale-[0.98]"
        >
          {settling ? "結算中…" : "結算今日飲食"}
        </button>

        {settlement && !showModal && (
          <button
            type="button"
            onClick={() => openSettlementModal(settlement)}
            className="mt-3 w-full text-center text-sm text-accent-light underline"
          >
            再看一次今日結算
          </button>
        )}
      </div>

      <Card>
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setGradesHistoryOpen((o) => !o)}
        >
          <span className="card-title mb-0">
            歷史評分
            {settlementHistory.filter((s) => !isToday(s.logDate)).length > 0 && (
              <span className="ml-2 font-normal text-text-muted">
                ({settlementHistory.filter((s) => !isToday(s.logDate)).length})
              </span>
            )}
          </span>
          <span className="text-sm text-text-muted">
            {gradesHistoryOpen ? "收起" : "展開"}
          </span>
        </button>
        {gradesHistoryOpen && (
          <div className="mt-3">
            <DietGradeHistory
              settlements={settlementHistory}
              onSelect={(s) => openSettlementModal(s)}
            />
          </div>
        )}
      </Card>

      <Card title="餐點紀錄">
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            用助手記錄吃了什麼，會自動帶入時間
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {sorted.map((d) => (
              <li key={d.id} className="flex gap-3 py-3">
                <time
                  className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-accent"
                  dateTime={d.loggedAt}
                >
                  {formatTime(d.loggedAt)}
                </time>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{d.foodName}</p>
                    {d.mealType && (
                      <span className="rounded-md bg-bg-elevated px-1.5 py-0.5 text-xs text-text-muted">
                        {MEAL_LABEL[d.mealType]}
                      </span>
                    )}
                    {!isToday(d.loggedAt) && (
                      <span className="text-xs text-text-muted">
                        {d.loggedAt.slice(0, 10)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-text-muted tabular-nums">
                    {d.calories} kcal · P{d.proteinG} C{d.carbsG} F{d.fatG}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="週評">
        <button
          type="button"
          disabled={weeklyLoading}
          onClick={() => void submitWeeklyEval()}
          className="mb-3 min-h-[44px] w-full rounded-xl border border-border bg-bg-elevated text-sm font-semibold text-text disabled:opacity-50"
        >
          {weeklyLoading ? "產生週報中…" : "生成本週 AI 週評"}
        </button>
        {weeklyGrades.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">
            尚無週評，點上方按鈕依本週紀錄產生
          </p>
        ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {weeklyGrades.map((g) => (
            <div
              key={`${g.year ?? ""}-${g.weekNumber ?? g.weekLabel}`}
              className="min-w-[88px] shrink-0 rounded-xl bg-bg-elevated p-3"
            >
              <p className="text-xs text-text-muted">{g.weekLabel}</p>
              <p
                className={cn(
                  "my-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold",
                  GRADE_STYLE[g.grade],
                )}
              >
                {g.grade}
              </p>
              <p className="line-clamp-2 text-xs leading-snug text-text-muted">
                {g.summary}
              </p>
            </div>
          ))}
        </div>
        )}
      </Card>

      {showModal && modalSettlement && (
        <DietSettlementModal
          data={modalSettlement}
          coachReply={coachReply}
          onClose={() => {
            setShowModal(false);
            setModalSettlement(null);
          }}
        />
      )}
    </div>
  );
}
