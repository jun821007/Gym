"use client";

import { SettlementGradeCompare } from "@/components/dashboard/SettlementGradeCompare";
import type { DailyDietSettlement } from "@/lib/types";

interface DietGradeHistoryProps {
  settlements: DailyDietSettlement[];
  onSelect: (s: DailyDietSettlement) => void;
}

export function DietGradeHistory({
  settlements,
  onSelect,
}: DietGradeHistoryProps) {
  return (
    <SettlementGradeCompare
      settlements={settlements}
      onSelect={onSelect}
      renderSubtitle={(s) => (
        <>
          {s.mealCount} 餐 · {s.totals.calories} kcal · 水 {s.waterMl}ml
        </>
      )}
    />
  );
}
