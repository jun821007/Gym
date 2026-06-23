"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DietAddForm } from "@/components/dashboard/DietAddForm";
import { DietGradeHistory } from "@/components/dashboard/DietGradeHistory";
import { DietRecordSection } from "@/components/dashboard/DietRecordSection";
import { DietSettlementModal } from "@/components/dashboard/DietSettlementModal";
import { FavoriteMealsPanel } from "@/components/dashboard/FavoriteMealsPanel";
import { WeeklyGradeModal } from "@/components/dashboard/WeeklyGradeModal";
import { Card } from "@/components/ui/Card";
import { DateShiftHeader } from "@/components/ui/DateShiftHeader";
import { NutrientBar } from "@/components/ui/NutrientBar";
import {
  canGenerateWeeklyEval,
  findBackfillWeeklyEvalWeek,
  formatDateLabel,
  getDefaultWeeklyEvalWeek,
  getIsoWeek,
  hasWeeklyGrade,
  isoWeekDateRange,
  isToday,
  toDateKey,
  yesterdayDateKey,
} from "@/lib/datetime";
import {
  DEFAULT_SODIUM_GOAL_MG,
  getLatestInbodyRecord,
  inferDietPhase,
} from "@/lib/nutrition-goals";
import {
  computeDietSettlement,
  xpForDietGrade,
} from "@/lib/diet-grading";
import { isSameDateKey } from "@/lib/logged-at";
import type {
  BodyGoals,
  DailyDietSettlement,
  DailyWorkoutSettlement,
  DietLog,
  FavoriteMeal,
  UserProfile,
  WeeklyGrade,
} from "@/lib/types";
import {
  getWaterEntriesForDate,
  sumWaterMl,
} from "@/lib/water-intake";
import type { WaterLogEntry } from "@/lib/water-intake";
import { cn } from "@/lib/utils";

interface TavernTabProps {
  profile: UserProfile;
  bodyGoals: BodyGoals;
  nutritionRationale?: string | null;
  nutritionGoals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  diets: DietLog[];
  waterLogs: WaterLogEntry[];
  favorites: FavoriteMeal[];
  settlementHistory: DailyDietSettlement[];
  workoutSettlements: DailyWorkoutSettlement[];
  weeklyGrades: WeeklyGrade[];
  onDietAdd: (
    log: Omit<DietLog, "id">,
    options?: { addToFavorites?: boolean },
  ) => void | Promise<void>;
  onDietUpdate: (id: string, log: Omit<DietLog, "id">) => void | Promise<void>;
  onDietDelete: (id: string) => void | Promise<void>;
  onFavoriteDelete: (id: string) => void | Promise<void>;
  onWaterAdd: (amountMl: number, logDate: string) => void | Promise<void>;
  onWaterUpdate: (
    id: string,
    patch: { amountMl: number; logDate: string; loggedAt: string },
  ) => void | Promise<void>;
  onWaterDelete: (id: string) => void | Promise<void>;
  onWaterGoalChange: (goalMl: number) => void | Promise<void>;
  onSettlementSaved: (s: DailyDietSettlement) => void | Promise<void>;
  onDeleteSettlement?: (s: DailyDietSettlement) => void | Promise<void>;
  onWeeklyGradeGenerated: (g: WeeklyGrade) => void | Promise<void>;
  onDeleteWeeklyGrade?: (g: WeeklyGrade) => void | Promise<void>;
  onSettlement?: (data: {
    settlement: DailyDietSettlement;
    xpGained?: number;
  }) => void;
}

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
  bodyGoals,
  nutritionRationale,
  nutritionGoals,
  diets,
  waterLogs,
  favorites,
  settlementHistory,
  workoutSettlements,
  weeklyGrades,
  onDietAdd,
  onDietUpdate,
  onDietDelete,
  onFavoriteDelete,
  onWaterAdd,
  onWaterUpdate,
  onWaterDelete,
  onWaterGoalChange,
  onSettlementSaved,
  onDeleteSettlement,
  onWeeklyGradeGenerated,
  onDeleteWeeklyGrade,
  onSettlement,
}: TavernTabProps) {
  const [recordDate, setRecordDate] = useState(toDateKey());
  const [gradeBrowseDateKey, setGradeBrowseDateKey] = useState(toDateKey());
  const [todaySettlement, setTodaySettlement] =
    useState<DailyDietSettlement | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalSettlement, setModalSettlement] =
    useState<DailyDietSettlement | null>(null);
  const [coachReply, setCoachReply] = useState("");
  const [settling, setSettling] = useState(false);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [gradesHistoryOpen, setGradesHistoryOpen] = useState(true);
  const [selectedWeeklyGrade, setSelectedWeeklyGrade] =
    useState<WeeklyGrade | null>(null);

  const waterGoalMl = profile.dailyWaterGoalMl ?? 2000;
  const sodiumGoalMg = profile.dailySodiumGoalMg ?? DEFAULT_SODIUM_GOAL_MG;
  const fiberGoalG = profile.dailyFiberGoalG ?? 25;

  const dietPhase = useMemo(() => {
    const latest = getLatestInbodyRecord(profile.inbodyHistory);
    if (!latest) return "maintain" as const;
    return inferDietPhase(latest, bodyGoals);
  }, [profile.inbodyHistory, bodyGoals]);

  const recordDateMeals = useMemo(
    () => diets.filter((d) => isSameDateKey(d.loggedAt, recordDate)),
    [diets, recordDate],
  );

  const recordDateWaterMl = useMemo(
    () => sumWaterMl(getWaterEntriesForDate(waterLogs, recordDate)),
    [waterLogs, recordDate],
  );

  const recordDateSettlement = useMemo(
    () => settlementHistory.find((s) => s.logDate === recordDate) ?? null,
    [settlementHistory, recordDate],
  );

  const totals = useMemo(
    () =>
      recordDateMeals.reduce(
        (acc, d) => ({
          calories: acc.calories + d.calories,
          protein: acc.protein + d.proteinG,
          carbs: acc.carbs + d.carbsG,
          fat: acc.fat + d.fatG,
          sodium: acc.sodium + (d.sodiumMg ?? 0),
          fiber: acc.fiber + (d.fiberG ?? 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0, fiber: 0 },
      ),
    [recordDateMeals],
  );

  useEffect(() => {
    const today =
      settlementHistory.find((s) => isToday(s.logDate)) ?? null;
    setTodaySettlement(today);
  }, [settlementHistory]);

  const todayKey = toDateKey();
  const defaultEvalWeek = useMemo(
    () => getDefaultWeeklyEvalWeek(),
    [todayKey],
  );
  const defaultEvalRange = useMemo(
    () => isoWeekDateRange(defaultEvalWeek.year, defaultEvalWeek.weekNumber),
    [defaultEvalWeek],
  );
  const defaultWeekMissing = useMemo(
    () => !hasWeeklyGrade(weeklyGrades, defaultEvalWeek),
    [weeklyGrades, defaultEvalWeek],
  );
  const defaultEvalIsCurrentWeek = useMemo(() => {
    const current = getIsoWeek();
    return (
      defaultEvalWeek.year === current.year &&
      defaultEvalWeek.weekNumber === current.weekNumber
    );
  }, [defaultEvalWeek, todayKey]);

  const backfillWeek = useMemo(
    () => findBackfillWeeklyEvalWeek(weeklyGrades),
    [weeklyGrades, todayKey],
  );
  const backfillRange = useMemo(
    () =>
      backfillWeek
        ? isoWeekDateRange(backfillWeek.year, backfillWeek.weekNumber)
        : null,
    [backfillWeek],
  );

  function openSettlementModal(s: DailyDietSettlement, reply = "") {
    setModalSettlement(s);
    setCoachReply(reply);
    setShowModal(true);
  }

  async function handleWeeklyGradeDelete(g: WeeklyGrade) {
    if (!onDeleteWeeklyGrade) return;
    if (g.year == null || g.weekNumber == null) return;
    const range = isoWeekDateRange(g.year, g.weekNumber);
    const label = `W${g.weekNumber}（${range.shortLabel}）`;
    if (!confirm(`確定刪除 ${label} 的週評紀錄？此動作無法復原。`)) {
      return;
    }
    await onDeleteWeeklyGrade(g);
    if (
      selectedWeeklyGrade?.year === g.year &&
      selectedWeeklyGrade?.weekNumber === g.weekNumber
    ) {
      setSelectedWeeklyGrade(null);
    }
  }

  const submitSettlement = useCallback(
    async (targetDate: string) => {
      const meals = diets.filter((d) => isSameDateKey(d.loggedAt, targetDate));
      const waterMl = sumWaterMl(
        getWaterEntriesForDate(waterLogs, targetDate),
      );

      if (meals.length === 0 && waterMl <= 0) {
        alert("請先記錄該日餐點或飲水，再進行結算");
        return;
      }

      setSettling(true);
      try {
        const mealTotals = meals.reduce(
          (acc, d) => ({
            calories: acc.calories + d.calories,
            protein: acc.protein + d.proteinG,
            carbs: acc.carbs + d.carbsG,
            fat: acc.fat + d.fatG,
            sodium: acc.sodium + (d.sodiumMg ?? 0),
            fiber: acc.fiber + (d.fiberG ?? 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0, fiber: 0 },
        );

        const payload = {
          goals: {
            calories: nutritionGoals.calories,
            proteinG: nutritionGoals.proteinG,
            carbsG: nutritionGoals.carbsG,
            fatG: nutritionGoals.fatG,
            sodiumMg: sodiumGoalMg,
            fiberG: fiberGoalG,
            waterMl: waterGoalMl,
          },
          totals: {
            calories: mealTotals.calories,
            proteinG: mealTotals.protein,
            carbsG: mealTotals.carbs,
            fatG: mealTotals.fat,
            sodiumMg: mealTotals.sodium,
            fiberG: mealTotals.fiber,
          },
          meals: meals.map((d) => ({
            foodName: d.foodName,
            calories: d.calories,
            proteinG: d.proteinG,
            carbsG: d.carbsG,
            fatG: d.fatG,
            sodiumMg: d.sodiumMg ?? 0,
            fiberG: d.fiberG ?? 0,
            loggedAt: d.loggedAt,
          })),
          waterMl,
          dietPhase,
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
              s = {
                ...(data.settlement as DailyDietSettlement),
                logDate: targetDate,
              };
              reply = data.reply ?? "";
            } else {
              throw new Error(data.reply ?? data.error ?? "結算失敗");
            }
          } catch {
            s = {
              ...computeDietSettlement({
                profile,
                todayMeals: meals,
                waterMl,
                waterGoalMl,
                dietPhase,
              }),
              logDate: targetDate,
            };
            reply = s.summary;
          }
        } else {
          s = {
            ...computeDietSettlement({
              profile,
              todayMeals: meals,
              waterMl,
              waterGoalMl,
              dietPhase,
            }),
            logDate: targetDate,
          };
          reply = s.summary;
        }

        if (isToday(targetDate)) setTodaySettlement(s);
        await onSettlementSaved(s);
        openSettlementModal(s, reply);

        const xpGained = xpForDietGrade(s.grade);
        onSettlement?.({ settlement: s, xpGained });
      } catch (e) {
        alert(e instanceof Error ? e.message : "結算失敗");
      } finally {
        setSettling(false);
      }
    },
    [
      diets,
      waterLogs,
      profile,
      nutritionGoals,
      waterGoalMl,
      sodiumGoalMg,
      fiberGoalG,
      dietPhase,
      onSettlement,
      onSettlementSaved,
    ],
  );

  const submitWeeklyEval = useCallback(
    async (targetWeek?: { year: number; weekNumber: number }) => {
      setWeeklyLoading(true);
      try {
        const { year, weekNumber } =
          targetWeek ?? getDefaultWeeklyEvalWeek();
        if (!canGenerateWeeklyEval(year, weekNumber)) {
          throw new Error(
            "此週尚未結束，請週日再產生本週週評，或選擇已結束的週次補登。",
          );
        }
        const weekLabel = `W${weekNumber}`;
        const range = isoWeekDateRange(year, weekNumber);
        const inWeek = (dateKey: string) =>
          dateKey >= range.start && dateKey <= range.end;

        const snapshot = {
          diets: diets.filter((d) => inWeek(d.loggedAt.slice(0, 10))),
          dietSettlements: settlementHistory.filter((s) => inWeek(s.logDate)),
          workoutSettlements: workoutSettlements.filter((s) =>
            inWeek(s.logDate),
          ),
          waterLogs: waterLogs.filter((w) => inWeek(w.logDate)),
          goals: {
            calories: nutritionGoals.calories,
            protein: nutritionGoals.proteinG,
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
    },
    [
      diets,
      settlementHistory,
      workoutSettlements,
      waterLogs,
      nutritionGoals,
      waterGoalMl,
      onWeeklyGradeGenerated,
    ],
  );

  const settleLabel =
    recordDate === toDateKey()
      ? todaySettlement
        ? "重新結算今日"
        : "結算今日飲食"
      : recordDateSettlement
        ? `重新結算 ${formatDateLabel(recordDate)}`
        : `結算 ${formatDateLabel(recordDate)}`;

  return (
    <div className="space-y-4 pb-2">
      <Card>
        <DateShiftHeader
          dateKey={recordDate}
          onChange={setRecordDate}
          title="攝取"
        />
        {nutritionRationale && (
          <p className="mb-3 text-xs leading-relaxed text-text-muted">
            {nutritionRationale}
          </p>
        )}
        <div className="space-y-4">
          <NutrientBar
            label="熱量"
            current={totals.calories}
            goal={nutritionGoals.calories}
            unit=" kcal"
            color="#6ee7a0"
          />
          <NutrientBar
            label="蛋白質"
            current={Math.round(totals.protein)}
            goal={nutritionGoals.proteinG}
            unit="g"
            color="#38b764"
          />
          <NutrientBar
            label="碳水"
            current={Math.round(totals.carbs)}
            goal={nutritionGoals.carbsG}
            unit="g"
            color="#5b9cf5"
          />
          <NutrientBar
            label="脂肪"
            current={Math.round(totals.fat)}
            goal={nutritionGoals.fatG}
            unit="g"
            color="#e85d75"
          />
          <NutrientBar
            label="鈉"
            current={Math.round(totals.sodium)}
            goal={sodiumGoalMg}
            unit="mg"
            color="#f59e0b"
            limit
          />
          <NutrientBar
            label="膳食纖維"
            current={Math.round(totals.fiber)}
            goal={fiberGoalG}
            unit="g"
            color="#a78bfa"
          />
          <NutrientBar
            label="水分"
            current={recordDateWaterMl}
            goal={waterGoalMl}
            unit="ml"
            color="#38bdf8"
          />
        </div>
      </Card>

      <DietAddForm defaultDate={recordDate} onSave={onDietAdd} />

      <FavoriteMealsPanel
        favorites={favorites}
        recordDate={recordDate}
        onQuickAdd={onDietAdd}
        onDelete={onFavoriteDelete}
      />

      <DietRecordSection
        diets={diets}
        waterLogs={waterLogs}
        waterGoalMl={waterGoalMl}
        recordDate={recordDate}
        onWaterAdd={onWaterAdd}
        onWaterGoalChange={onWaterGoalChange}
        onDietUpdate={onDietUpdate}
        onDietDelete={onDietDelete}
        onWaterUpdate={onWaterUpdate}
        onWaterDelete={onWaterDelete}
      />

      <div className="pixel-card pixel-card--hero">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-pixel-sm font-bold text-accent-light">
              ▶ {formatDateLabel(recordDate)}結算
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {recordDateMeals.length} 餐 · 飲水 {recordDateWaterMl} ml
            </p>
          </div>
          {(recordDate === toDateKey()
            ? todaySettlement
            : recordDateSettlement) && (
            <span
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center border-[4px] border-solid font-pixel text-3xl",
                GRADE_BADGE[
                  (recordDate === toDateKey()
                    ? todaySettlement
                    : recordDateSettlement)!.grade
                ],
              )}
            >
              {(recordDate === toDateKey()
                ? todaySettlement
                : recordDateSettlement)!.grade}
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={settling}
          onClick={() => void submitSettlement(recordDate)}
          className="mt-4 min-h-[48px] w-full border-[3px] border-solid border-border-pixel bg-accent text-base font-bold text-bg-app disabled:opacity-50 active:scale-[0.98]"
        >
          {settling ? "結算中…" : settleLabel}
        </button>

        {recordDate === toDateKey() && todaySettlement && !showModal && (
          <button
            type="button"
            onClick={() => openSettlementModal(todaySettlement)}
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
            {settlementHistory.filter(
              (s) =>
                !isToday(s.logDate) && s.logDate !== yesterdayDateKey(),
            ).length > 0 && (
              <span className="ml-2 font-normal text-text-muted">
                (
                {
                  settlementHistory.filter(
                    (s) =>
                      !isToday(s.logDate) &&
                      s.logDate !== yesterdayDateKey(),
                  ).length
                }
                )
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
              browseDateKey={gradeBrowseDateKey}
              onBrowseDateChange={setGradeBrowseDateKey}
              onSelect={(s) => openSettlementModal(s)}
              onDelete={onDeleteSettlement}
              onRequestSettle={(dateKey) => void submitSettlement(dateKey)}
              settlePending={settling}
            />
          </div>
        )}
      </Card>

      <Card title="週評">
        {defaultWeekMissing ? (
          <button
            type="button"
            disabled={weeklyLoading}
            onClick={() => void submitWeeklyEval(defaultEvalWeek)}
            className="mb-3 min-h-[44px] w-full rounded-xl border border-border bg-bg-elevated text-sm font-semibold text-text disabled:opacity-50"
          >
            {weeklyLoading
              ? "產生週報中…"
              : defaultEvalIsCurrentWeek
                ? `產生本週 W${defaultEvalWeek.weekNumber}（${defaultEvalRange.shortLabel}）週評`
                : `產生上週 W${defaultEvalWeek.weekNumber}（${defaultEvalRange.shortLabel}）週評`}
          </button>
        ) : (
          <p className="mb-3 text-center text-sm text-text-muted">
            W{defaultEvalWeek.weekNumber}（{defaultEvalRange.shortLabel}）週評已產生
          </p>
        )}
        {backfillWeek && backfillRange && (
          <button
            type="button"
            disabled={weeklyLoading}
            onClick={() => void submitWeeklyEval(backfillWeek)}
            className="mb-3 min-h-[44px] w-full rounded-xl border border-accent/40 bg-accent/10 text-sm font-semibold text-accent-light disabled:opacity-50"
          >
            {weeklyLoading
              ? "產生週報中…"
              : `補登 W${backfillWeek.weekNumber}（${backfillRange.shortLabel}）`}
          </button>
        )}
        {weeklyGrades.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">
            尚無週評，週一～週六請產生上週週評，週日可產生本週週評
          </p>
        ) : (
          <div className="space-y-2">
            {weeklyGrades.map((g) => {
              const range =
                g.year != null && g.weekNumber != null
                  ? isoWeekDateRange(g.year, g.weekNumber)
                  : null;
              return (
                <div
                  key={`${g.year ?? ""}-${g.weekNumber ?? g.weekLabel}`}
                  className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated p-3"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedWeeklyGrade(g)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.99]"
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold",
                        GRADE_STYLE[g.grade],
                      )}
                    >
                      {g.grade}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-text">
                        {g.weekLabel}
                        {range && (
                          <span className="ml-1.5 font-normal text-text-muted">
                            {range.shortLabel}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-text-muted">
                        {g.summary}
                      </p>
                    </div>
                  </button>
                  {onDeleteWeeklyGrade &&
                    g.year != null &&
                    g.weekNumber != null && (
                      <button
                        type="button"
                        onClick={() => void handleWeeklyGradeDelete(g)}
                        className="min-h-[36px] shrink-0 rounded-lg border border-border px-3 text-xs text-text-muted"
                      >
                        刪除
                      </button>
                    )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {selectedWeeklyGrade && (
        <WeeklyGradeModal
          grade={selectedWeeklyGrade}
          onClose={() => setSelectedWeeklyGrade(null)}
          onDelete={onDeleteWeeklyGrade}
        />
      )}

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
