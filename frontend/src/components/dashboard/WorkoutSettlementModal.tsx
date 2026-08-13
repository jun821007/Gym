"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { formatDurationClock } from "@/lib/datetime";
import type { DailyWorkoutSettlement } from "@/lib/types";
import { WORKOUT_GRADE_META } from "@/lib/rank-grade";
import { settlementLogVolume } from "@/lib/workout-grading";
import { formatSettlementSetLines } from "@/lib/workout-volume";
import { cn } from "@/lib/utils";

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
  const style = WORKOUT_GRADE_META[data.grade] ?? WORKOUT_GRADE_META.S;

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

  const duration = formatDurationClock(data.durationMinutes);

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
                    ? formatSettlementSetLines(l.setLines, {
                        unilateral: l.loadType === "unilateral",
                      })
                    : `${l.loadType === "unilateral" ? "單邊 " : ""}${l.weightKg}kg×${l.reps}×${l.sets}`}
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
