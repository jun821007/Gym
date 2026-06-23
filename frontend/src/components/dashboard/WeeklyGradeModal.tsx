"use client";

import { createPortal } from "react-dom";
import { isoWeekDateRange } from "@/lib/datetime";
import type { WeeklyGrade } from "@/lib/types";
import { cn } from "@/lib/utils";

const GRADE_STYLE: Record<WeeklyGrade["grade"], string> = {
  S: "bg-accent/30 text-accent-light border-accent-light",
  A: "bg-accent/20 text-accent border-accent",
  B: "bg-sky-500/20 text-sky-300 border-sky-400",
  C: "bg-bg-elevated text-text-muted border-border",
};

interface WeeklyGradeModalProps {
  grade: WeeklyGrade;
  onClose: () => void;
}

export function WeeklyGradeModal({ grade, onClose }: WeeklyGradeModalProps) {
  const range =
    grade.year != null && grade.weekNumber != null
      ? isoWeekDateRange(grade.year, grade.weekNumber)
      : null;

  const title = range ? `${range.shortLabel} 週評` : grade.weekLabel;

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-black/55 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-bg-card p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-text-muted">{title}</p>
            {range && (
              <p className="mt-0.5 text-xs text-text-muted">
                {range.start} ~ {range.end}
              </p>
            )}
          </div>
          <span
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-solid text-xl font-bold",
              GRADE_STYLE[grade.grade],
            )}
          >
            {grade.grade}
          </span>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-text">
          {grade.summary}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-[44px] w-full rounded-xl border border-border bg-bg-elevated text-sm font-semibold"
        >
          關閉
        </button>
      </div>
    </div>,
    document.body,
  );
}
