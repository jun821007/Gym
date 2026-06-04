"use client";

import { formatRolloverPromptTime } from "@/lib/day-rollover";

interface DayRolloverModalProps {
  foodLabel: string;
  onChoose: (choice: "today" | "yesterday") => void;
}

export function DayRolloverModal({ foodLabel, onChoose }: DayRolloverModalProps) {
  const time = formatRolloverPromptTime();

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-bg-elevated p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-rollover-title"
      >
        <h2
          id="day-rollover-title"
          className="text-center text-lg font-bold text-accent-light"
        >
          這餐算哪一天？
        </h2>
        <p className="mt-2 text-center text-sm text-text-muted">
          現在 {time}，已過午夜。
          <br />
          「{foodLabel}」要算進哪一天的飲食紀錄？
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            className="min-h-[48px] rounded-xl bg-accent font-bold text-bg-app"
            onClick={() => onChoose("yesterday")}
          >
            算昨天（訓練／下班那天）
          </button>
          <button
            type="button"
            className="min-h-[48px] rounded-xl border border-border bg-bg-app font-bold text-text"
            onClick={() => onChoose("today")}
          >
            算今天（日曆上的今天）
          </button>
        </div>
      </div>
    </div>
  );
}
