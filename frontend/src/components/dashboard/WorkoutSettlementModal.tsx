"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { DailyWorkoutSettlement, RankGrade } from "@/lib/types";
import { settlementLogVolume } from "@/lib/workout-grading";
import { formatSettlementSetLines } from "@/lib/workout-volume";
import { cn } from "@/lib/utils";

const GRADE_STYLE: Record<
  RankGrade,
  { ring: string; glow: string; label: string }
> = {
  S: {
    ring: "border-accent-light text-accent-light",
    glow: "shadow-[0_0_40px_rgba(110,231,160,0.55)]",
    label: "傳說級訓練",
  },
  A: {
    ring: "border-accent text-accent",
    glow: "shadow-[0_0_32px_rgba(56,189,148,0.45)]",
    label: "優秀表現",
  },
  B: {
    ring: "border-sky-400 text-sky-300",
    glow: "shadow-[0_0_24px_rgba(96,165,250,0.35)]",
    label: "穩定輸出",
  },
  C: {
    ring: "border-text-muted text-text-muted",
    glow: "shadow-[0_0_16px_rgba(155,173,183,0.25)]",
    label: "還需加油",
  },
  D: {
    ring: "border-danger text-danger",
    glow: "shadow-[0_0_16px_rgba(232,93,117,0.35)]",
    label: "明日再戰",
  },
};

interface WorkoutSettlementModalProps {
  data: DailyWorkoutSettlement;
  coachReply?: string;
  onClose: () => void;
}

export function WorkoutSettlementModal({
  data,
  coachReply,
  onClose,
}: WorkoutSettlementModalProps) {
  const [mounted, setMounted] = useState(false);
  const [stamp, setStamp] = useState(false);
  const style = GRADE_STYLE[data.grade];

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const t = setTimeout(() => setStamp(true), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("chat-modal-open");
    return () => document.documentElement.classList.remove("chat-modal-open");
  }, []);

  if (!mounted) return null;

  const hours = Math.floor(data.durationMinutes / 60);
  const mins = data.durationMinutes % 60;
  const duration =
    hours > 0 ? `${hours}:${String(mins).padStart(2, "0")}` : `${mins} 分`;

  return createPortal(
    <div className="settlement-root" role="dialog" aria-modal="true">
      <div className="settlement-bg" />
      <div className="settlement-panel pixel-card">
        <p className="text-pixel-sm text-center font-bold text-accent-light">
          ▶ 今日訓練結算
        </p>
        <p className="mt-1 text-center text-sm text-text-muted">
          {data.workoutName}
        </p>

        {data.bodyWeightKg != null && (
          <p className="mt-2 text-center text-xs text-accent-light">
            依體重 {data.bodyWeightKg}kg 個人化評分
            {data.volumePerBodyWeight != null &&
              ` · 相對訓練量 ${data.volumePerBodyWeight}`}
          </p>
        )}

        {data.manualLogs.length > 0 && (
          <div className="mt-3 border-[3px] border-solid border-border-pixel bg-bg-elevated p-2">
            <p className="text-xs font-semibold text-accent-light">
              今日清單 · {data.manualLogs.length} 項 · 訓練量{" "}
              {Math.round(data.totalVolumeKg)}
              {data.bodyWeightKg != null &&
                `（÷${data.bodyWeightKg}kg）`}
            </p>
            <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto text-xs text-text-muted">
              {data.manualLogs.map((l, i) => (
                <li key={i}>
                  <span className="font-semibold text-text">{l.exerciseName}</span>
                  {" · "}
                  {l.setLines?.length
                    ? formatSettlementSetLines(l.setLines)
                    : `${l.weightKg}kg×${l.reps}×${l.sets}`}
                  <span className="ml-1 tabular-nums opacity-80">
                    （{Math.round(settlementLogVolume(l))}）
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="border-[3px] border-solid border-border-pixel bg-bg-elevated p-2 text-center">
            <p className="text-xs text-text-muted">時長</p>
            <p className="font-bold tabular-nums text-accent-light">{duration}</p>
          </div>
          <div className="border-[3px] border-solid border-border-pixel bg-bg-elevated p-2 text-center">
            <p className="text-xs text-text-muted">動態大卡</p>
            <p className="font-bold tabular-nums text-danger">
              {data.activeCalories || "—"}
            </p>
          </div>
          <div className="border-[3px] border-solid border-border-pixel bg-bg-elevated p-2 text-center">
            <p className="text-xs text-text-muted">總大卡</p>
            <p className="font-bold tabular-nums">
              {data.totalCalories || "—"}
            </p>
          </div>
          <div className="border-[3px] border-solid border-border-pixel bg-bg-elevated p-2 text-center">
            <p className="text-xs text-text-muted">平均心率</p>
            <p className="font-bold tabular-nums">
              {data.avgHeartRate ? `${data.avgHeartRate}` : "—"}
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-sm leading-relaxed text-text">
          {data.summary}
        </p>
        {coachReply && (
          <p className="mt-2 text-center text-xs text-text-muted">
            教練：{coachReply}
          </p>
        )}

        <div className="relative my-8 flex h-36 items-center justify-center">
          <div
            className={cn(
              "grade-stamp border-[6px] border-solid font-pixel transition-all duration-500",
              style.ring,
              style.glow,
              stamp
                ? "scale-100 rotate-[-12deg] opacity-100"
                : "scale-[2.2] rotate-[-24deg] opacity-0",
            )}
          >
            <span className="block text-7xl leading-none">{data.grade}</span>
            <span className="mt-1 block text-center text-[10px]">
              {style.label}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="min-h-[52px] w-full border-[3px] border-solid border-border-pixel bg-accent text-base font-bold text-bg-app active:scale-[0.98]"
        >
          確認結算
        </button>
      </div>
    </div>,
    document.body,
  );
}
