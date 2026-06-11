"use client";

import { SettlementGradeCompare } from "@/components/dashboard/SettlementGradeCompare";
import type { DailyDietSettlement } from "@/lib/types";

interface DietGradeHistoryProps {
  settlements: DailyDietSettlement[];
  browseDateKey: string;
  onBrowseDateChange: (dateKey: string) => void;
  onSelect: (s: DailyDietSettlement) => void;
  onDelete?: (s: DailyDietSettlement) => void | Promise<void>;
  onRequestSettle?: (dateKey: string) => void | Promise<void>;
  settlePending?: boolean;
}

export function DietGradeHistory({
  settlements,
  browseDateKey,
  onBrowseDateChange,
  onSelect,
  onDelete,
  onRequestSettle,
  settlePending,
}: DietGradeHistoryProps) {
  return (
    <SettlementGradeCompare
      settlements={settlements}
      browseDateKey={browseDateKey}
      onBrowseDateChange={onBrowseDateChange}
      onSelect={onSelect}
      onDelete={onDelete}
      onRequestSettle={onRequestSettle}
      settlePending={settlePending}
      renderSubtitle={(s) => (
        <>
          {s.mealCount} 餐 · {s.totals.calories} kcal · 水 {s.waterMl}ml
        </>
      )}
    />
  );
}
