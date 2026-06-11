"use client";

import { useState } from "react";
import { DateShiftHeader } from "@/components/ui/DateShiftHeader";
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

interface SettlementGradeCompareProps<
  T extends { logDate: string; grade: RankGrade; summary?: string },
> {
  settlements: T[];
  onSelect: (s: T) => void;
  onDelete?: (s: T) => void | Promise<void>;
  onRequestSettle?: (dateKey: string) => void | Promise<void>;
  settlePending?: boolean;
  browseDateKey?: string;
  onBrowseDateChange?: (dateKey: string) => void;
  renderSubtitle: (s: T) => React.ReactNode;
  renderExtra?: (s: T) => React.ReactNode;
}

function SettlementRecordCard<
  T extends { logDate: string; grade: RankGrade; summary?: string },
>({
  settlement,
  label,
  dateKey,
  onSelect,
  onDelete,
  renderSubtitle,
  renderExtra,
  compact = false,
}: {
  settlement: T;
  label?: string;
  dateKey: string;
  onSelect: (s: T) => void;
  onDelete?: (s: T) => void | Promise<void>;
  renderSubtitle: (s: T) => React.ReactNode;
  renderExtra?: (s: T) => React.ReactNode;
  compact?: boolean;
}) {
  const gradeSize = compact ? "h-10 w-10 text-xl" : "h-12 w-12 text-2xl";

  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-3">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex shrink-0 items-center justify-center border-[3px] border-solid font-pixel",
            gradeSize,
            GRADE_BADGE[settlement.grade],
          )}
        >
          {settlement.grade}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text">
            {label ?? formatDateLabel(dateKey)}
            <span className="ml-2 text-xs font-normal text-text-muted">
              {dateKey}
            </span>
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
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onSelect(settlement)}
          className="min-h-[36px] flex-1 rounded-lg border border-accent/40 bg-accent/10 text-xs font-semibold text-accent-light"
        >
          查看
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={() => void onDelete(settlement)}
            className="min-h-[36px] shrink-0 rounded-lg border border-border px-3 text-xs text-text-muted"
          >
            刪除
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyDateSlot({
  label,
  dateKey,
  onRequestSettle,
  settlePending,
}: {
  label: string;
  dateKey: string;
  onRequestSettle?: (dateKey: string) => void | Promise<void>;
  settlePending?: boolean;
}) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg-app/50 p-3 text-center">
      <p className="text-sm font-semibold text-text-muted">{label}</p>
      <p className="mt-0.5 text-xs text-text-muted">{formatDateLabel(dateKey)}</p>
      <p className="mt-1 text-xs text-text-muted">尚無結算</p>
      {onRequestSettle && (
        <button
          type="button"
          disabled={settlePending}
          onClick={() => void onRequestSettle(dateKey)}
          className="mt-3 min-h-[36px] rounded-lg border border-accent/40 bg-accent/10 px-4 text-xs font-semibold text-accent-light disabled:opacity-50"
        >
          {settlePending ? "結算中…" : "補登結算"}
        </button>
      )}
    </div>
  );
}

export function SettlementGradeCompare<
  T extends { logDate: string; grade: RankGrade; summary?: string },
>({
  settlements,
  onSelect,
  onDelete,
  onRequestSettle,
  settlePending = false,
  browseDateKey: controlledBrowseDate,
  onBrowseDateChange,
  renderSubtitle,
  renderExtra,
}: SettlementGradeCompareProps<T>) {
  const [olderOpen, setOlderOpen] = useState(false);
  const [internalBrowseDate, setInternalBrowseDate] = useState(toDateKey);
  const browseDateKey = controlledBrowseDate ?? internalBrowseDate;
  const setBrowseDateKey = onBrowseDateChange ?? setInternalBrowseDate;

  const todayKey = toDateKey();
  const yKey = yesterdayDateKey();

  const todaySettlement = settlements.find((s) => isToday(s.logDate));
  const yesterdaySettlement = settlements.find((s) => isYesterday(s.logDate));
  const browseSettlement = settlements.find((s) => s.logDate === browseDateKey);
  const older = settlements.filter(
    (s) => s.logDate !== todayKey && s.logDate !== yKey,
  );

  const hasAny =
    todaySettlement || yesterdaySettlement || older.length > 0;

  async function handleDelete(s: T) {
    if (!onDelete) return;
    const label = formatDateLabel(s.logDate);
    if (
      !confirm(`確定刪除 ${label}（${s.logDate}）的評分紀錄？此動作無法復原。`)
    ) {
      return;
    }
    await onDelete(s);
  }

  return (
    <div className="space-y-3">
      <DateShiftHeader
        dateKey={browseDateKey}
        onChange={setBrowseDateKey}
        title="結算"
      />

      {browseSettlement ? (
        <SettlementRecordCard
          settlement={browseSettlement}
          dateKey={browseDateKey}
          label={
            isToday(browseDateKey)
              ? "今日"
              : isYesterday(browseDateKey)
                ? "昨天"
                : undefined
          }
          onSelect={onSelect}
          onDelete={onDelete ? handleDelete : undefined}
          renderSubtitle={renderSubtitle}
          renderExtra={renderExtra}
        />
      ) : (
        <div className="rounded-xl border border-border bg-bg-elevated p-3">
          <p className="text-sm font-semibold text-text">
            {isToday(browseDateKey)
              ? "今日"
              : isYesterday(browseDateKey)
                ? "昨天"
                : formatDateLabel(browseDateKey)}
            <span className="ml-2 text-xs font-normal text-text-muted">
              {browseDateKey}
            </span>
          </p>
          <p className="mt-2 text-center text-xs text-text-muted">尚無結算</p>
          {onRequestSettle && (
            <button
              type="button"
              disabled={settlePending}
              onClick={() => void onRequestSettle(browseDateKey)}
              className="mt-3 min-h-[40px] w-full rounded-lg border border-accent/40 bg-accent text-sm font-bold text-bg-app disabled:opacity-50"
            >
              {settlePending ? "結算中…" : "補登結算"}
            </button>
          )}
        </div>
      )}

      {hasAny ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {todaySettlement ? (
              <SettlementRecordCard
                settlement={todaySettlement}
                label="今日"
                dateKey={todayKey}
                onSelect={onSelect}
                onDelete={onDelete ? handleDelete : undefined}
                renderSubtitle={renderSubtitle}
                renderExtra={renderExtra}
                compact
              />
            ) : (
              <EmptyDateSlot
                label="今日"
                dateKey={todayKey}
                onRequestSettle={onRequestSettle}
                settlePending={settlePending}
              />
            )}
            {yesterdaySettlement ? (
              <SettlementRecordCard
                settlement={yesterdaySettlement}
                label="昨天"
                dateKey={yKey}
                onSelect={onSelect}
                onDelete={onDelete ? handleDelete : undefined}
                renderSubtitle={renderSubtitle}
                renderExtra={renderExtra}
                compact
              />
            ) : (
              <EmptyDateSlot
                label="昨天"
                dateKey={yKey}
                onRequestSettle={onRequestSettle}
                settlePending={settlePending}
              />
            )}
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
                      <SettlementRecordCard
                        settlement={s}
                        dateKey={s.logDate}
                        onSelect={onSelect}
                        onDelete={onDelete ? handleDelete : undefined}
                        renderSubtitle={renderSubtitle}
                        renderExtra={renderExtra}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      ) : (
        !onRequestSettle && (
          <p className="py-2 text-center text-sm text-text-muted">
            尚無過往評分，完成結算後會記錄在這裡
          </p>
        )
      )}
    </div>
  );
}
