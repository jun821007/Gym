"use client";

import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import {
  buildMonthlySummaries,
  formatDeltaLine,
} from "@/lib/inbody-analysis";
import type { InbodyRecord } from "@/lib/types";

const BodyAnalysisChart = dynamic(
  () =>
    import("@/components/dashboard/BodyAnalysisChart").then(
      (m) => m.BodyAnalysisChart,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="py-8 text-center text-sm text-text-muted">載入圖表…</p>
    ),
  },
);

interface BodyAnalysisSectionProps {
  history: InbodyRecord[];
}

export function BodyAnalysisSection({ history }: BodyAnalysisSectionProps) {
  const months = buildMonthlySummaries(history);

  return (
    <Card title="數據分析" pixel>
      <div className="h-52 w-full min-w-0">
        <BodyAnalysisChart history={history} />
      </div>

      {months.length === 0 ? (
        <p className="mt-4 text-center text-sm text-text-muted">
          累積 InBody 紀錄後顯示月彙總
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-accent-light">每月變化</p>
          <ul className="space-y-2">
            {months.map((m) => (
              <li
                key={m.monthKey}
                className="rounded-lg border border-border bg-bg-elevated p-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-text">{m.monthLabel}</span>
                  <span className="text-text-muted">{m.recordCount} 筆</span>
                </div>
                <p className="mt-1.5 tabular-nums text-text-muted">
                  體重{" "}
                  {m.weightStart != null && m.weightEnd != null
                    ? `${m.weightStart}→${m.weightEnd}kg（${formatDeltaLine(m.weightDelta, "")}）`
                    : "—"}
                </p>
                <p className="tabular-nums text-text-muted">
                  體脂{" "}
                  {m.fatStart != null && m.fatEnd != null
                    ? `${m.fatStart}→${m.fatEnd}%（${formatDeltaLine(m.fatDelta, "")}）`
                    : "—"}
                </p>
                <p className="tabular-nums text-text-muted">
                  骨骼肌{" "}
                  {m.muscleStart != null && m.muscleEnd != null
                    ? `${m.muscleStart}→${m.muscleEnd}kg（${formatDeltaLine(m.muscleDelta, "")}）`
                    : "—"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
