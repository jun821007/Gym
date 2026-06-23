"use client";

import { useMemo, useState } from "react";
import { WeeklyGradeModal } from "@/components/dashboard/WeeklyGradeModal";
import { Card } from "@/components/ui/Card";
import { isoWeekDateRange } from "@/lib/datetime";
import type { WeeklyGrade } from "@/lib/types";
import { cn } from "@/lib/utils";

const GRADE_STYLE: Record<WeeklyGrade["grade"], string> = {
  S: "border-accent-light/60 bg-accent/25 text-accent-light",
  A: "border-accent/50 bg-accent/15 text-accent",
  B: "border-sky-400/50 bg-sky-500/15 text-sky-300",
  C: "border-border bg-bg-elevated text-text-muted",
};

interface WeeklyAchievementPanelProps {
  weeklyGrades: WeeklyGrade[];
  defaultOpen?: boolean;
  onDeleteWeeklyGrade?: (g: WeeklyGrade) => void | Promise<void>;
}

export function WeeklyAchievementPanel({
  weeklyGrades,
  defaultOpen = false,
  onDeleteWeeklyGrade,
}: WeeklyAchievementPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [selected, setSelected] = useState<WeeklyGrade | null>(null);

  const sorted = useMemo(
    () =>
      [...weeklyGrades].sort((a, b) => {
        const ay = a.year ?? 0;
        const by = b.year ?? 0;
        if (ay !== by) return by - ay;
        return (b.weekNumber ?? 0) - (a.weekNumber ?? 0);
      }),
    [weeklyGrades],
  );

  const sCount = sorted.filter((g) => g.grade === "S").length;
  const aCount = sorted.filter((g) => g.grade === "A").length;

  return (
    <>
      <Card>
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setOpen((o) => !o)}
        >
          <div>
            <span className="card-title mb-0">週評成就</span>
            <p className="mt-1 text-xs text-text-muted">
              已累積 {sorted.length} 週
              {sorted.length > 0 && ` · S×${sCount} · A×${aCount}`}
            </p>
          </div>
          <span className="text-sm text-text-muted">{open ? "收起" : "展開"}</span>
        </button>

        {open && (
          <div className="mt-3">
            {sorted.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-muted">
                尚無週評徽章，至酒館分頁生成本週 AI 週評
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {sorted.map((g) => {
                  const range =
                    g.year != null && g.weekNumber != null
                      ? isoWeekDateRange(g.year, g.weekNumber)
                      : null;
                  return (
                    <button
                      key={`${g.year ?? ""}-${g.weekNumber ?? g.weekLabel}`}
                      type="button"
                      onClick={() => setSelected(g)}
                      className={cn(
                        "flex flex-col items-center rounded-xl border p-2.5 transition active:scale-[0.98]",
                        GRADE_STYLE[g.grade],
                      )}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-current text-lg font-bold">
                        {g.grade}
                      </span>
                      <p className="mt-1.5 text-center text-[10px] leading-tight opacity-90">
                        {range?.shortLabel ?? g.weekLabel}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>

      {selected && (
        <WeeklyGradeModal
          grade={selected}
          onClose={() => setSelected(null)}
          onDelete={onDeleteWeeklyGrade}
        />
      )}
    </>
  );
}
