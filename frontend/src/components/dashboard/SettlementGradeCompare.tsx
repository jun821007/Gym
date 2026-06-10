"use client";

import { useState } from "react";
import {
  formatDateLabel,
  isToday,
  isYesterday,
  toDateKey,
  yesterdayDateKey,
} from "@/lib/datetime";
import type { RankGrade } from "@/lib/types";
import { cn } from "@/lib/utils";

const GRADE_BADGE: Record<RankGrade, string> = {
  S: "bg-accent/30 text-accent-light border-accent-light",
  A: "bg-accent/20 text-accent border-accent",
  B: "bg-sky-500/20 text-sky-300 border-sky-400",
  C: "bg-bg-elevated text-text-muted border-border",
  D: "bg-danger/15 text-danger border-danger",
};

interface SettlementGradeCompareProps<T extends { logDate: string; grade: RankGrade; summary?: string }> {
  settlements: T[];
  onSelect: (s: T) => void;
  renderSubtitle: (s: T) => React.ReactNode;
  renderExtra?: (s: T) => React.ReactNode;
}

function CompareSlot<T extends { logDate: string; grade: RankGrade; summary?: string }>({
  label,
  dateKey,
  settlement,
  onSelect,
  renderSubtitle,
  renderExtra,
}: {
  label: string;
  dateKey: string;
  settlement: T | undefined;
  onSelect: (s: T) => void;
  renderSubtitle: (s: T) => React.ReactNode;
  renderExtra?: (s: T) => React.ReactNode;
}) {
  if (!settlement) {
    return (
      <div className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg-app/50 p-3 text-center">
        <p className="text-sm font-semibold text-text-muted">{label}</p>
        <p className="mt-1 text-xs text-text-muted">尚無結算</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(settlement)}
      className="flex min-h-[120px] flex-col rounded-xl border border-border bg-bg-elevated p-3 text-left active:scale-[0.99]"
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center border-[3px] border-solid font-pixel text-xl",
            GRADE_BADGE[settlement.grade],
          )}
        >
          {settlement.grade}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">{label}</p>
          <p className="text-xs text-text-muted">
            {formatDateLabel(dateKey)}
          </p>
          <div className="mt-1 text-xs tabular-nums text-text-muted">
            {renderSubtitle(settlement)}
          </div>
        </div>
      </div>
      {renderExtra?.(settlement)}
      {settlement.summary && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-text-muted">
          {settlement.summary}
        </p>
      )}
      <span className="mt-auto pt-2 text-xs text-accent-light">查看</span>
    </button>
  );
}

export function SettlementGradeCompare<T extends { logDate: string; grade: RankGrade; summary?: string }>({
  settlements,
  onSelect,
  renderSubtitle,
  renderExtra,
}: SettlementGradeCompareProps<T>) {
  const [olderOpen, setOlderOpen] = useState(false);
  const todayKey = toDateKey();
  const yKey = yesterdayDateKey();

  const todaySettlement = settlements.find((s) => isToday(s.logDate));
  const yesterdaySettlement = settlements.find((s) => isYesterday(s.logDate));
  const older = settlements.filter(
    (s) => s.logDate !== todayKey && s.logDate !== yKey,
  );

  const hasAny =
    todaySettlement || yesterdaySettlement || older.length > 0;

  if (!hasAny) {
    return (
      <p className="py-4 text-center text-sm text-text-muted">
        尚無過往評分，完成結算後會記錄在這裡
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <CompareSlot
          label="今日"
          dateKey={todayKey}
          settlement={todaySettlement}
          onSelect={onSelect}
          renderSubtitle={renderSubtitle}
          renderExtra={renderExtra}
        />
        <CompareSlot
          label="昨天"
          dateKey={yKey}
          settlement={yesterdaySettlement}
          onSelect={onSelect}
          renderSubtitle={renderSubtitle}
          renderExtra={renderExtra}
        />
      </div>

      {older.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOlderOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-muted"
          >
            <span>更早紀錄 ({older.length})</span>
            <span>{olderOpen ? "收起" : "展開"}</span>
          </button>
          {olderOpen && (
            <ul className="space-y-2">
              {older.map((s) => (
                <li key={s.logDate}>
                  <button
                    type="button"
                    onClick={() => onSelect(s)}
                    className="w-full rounded-xl border border-border bg-bg-elevated p-3 text-left active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center border-[3px] border-solid font-pixel text-2xl",
                          GRADE_BADGE[s.grade],
                        )}
                      >
                        {s.grade}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text">
                          {formatDateLabel(s.logDate)}
                          <span className="ml-2 text-xs font-normal text-text-muted">
                            {s.logDate}
                          </span>
                        </p>
                        <div className="mt-1 text-xs tabular-nums text-text-muted">
                          {renderSubtitle(s)}
                        </div>
                      </div>
                      <span className="text-xs text-accent-light">查看</span>
                    </div>
                    {s.summary && (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-text-muted">
                        {s.summary}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
