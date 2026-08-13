"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { DailyDietSettlement, RankGrade } from "@/lib/types";
import { cn } from "@/lib/utils";

const GRADE_STYLE: Record<
  RankGrade,
  { ring: string; glow: string; label: string }
> = {
  "SSS+": {
    ring: "border-accent-light text-accent-light",
    glow: "shadow-[0_0_40px_rgba(110,231,160,0.55)]",
    label: "完美補給",
  },
  SSS: {
    ring: "border-accent-light text-accent-light",
    glow: "shadow-[0_0_40px_rgba(110,231,160,0.55)]",
    label: "完美補給",
  },
  SS: {
    ring: "border-accent-light text-accent-light",
    glow: "shadow-[0_0_40px_rgba(110,231,160,0.55)]",
    label: "完美補給",
  },
  S: {
    ring: "border-accent-light text-accent-light",
    glow: "shadow-[0_0_40px_rgba(110,231,160,0.55)]",
    label: "完美補給",
  },
  A: {
    ring: "border-accent text-accent",
    glow: "shadow-[0_0_32px_rgba(56,189,148,0.45)]",
    label: "均衡達標",
  },
  B: {
    ring: "border-sky-400 text-sky-300",
    glow: "shadow-[0_0_24px_rgba(96,165,250,0.35)]",
    label: "尚可微調",
  },
  C: {
    ring: "border-text-muted text-text-muted",
    glow: "shadow-[0_0_16px_rgba(155,173,183,0.25)]",
    label: "明日加油",
  },
  D: {
    ring: "border-danger text-danger",
    glow: "shadow-[0_0_16px_rgba(232,93,117,0.35)]",
    label: "需重新規劃",
  },
};

interface DietSettlementModalProps {
  data: DailyDietSettlement;
  coachReply?: string;
  onClose: () => void;
}

export function DietSettlementModal({
  data,
  coachReply,
  onClose,
}: DietSettlementModalProps) {
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

  return createPortal(
    <div className="settlement-root" role="dialog" aria-modal="true">
      <div className="settlement-bg" />
      <div className="settlement-panel pixel-card">
        <p className="text-pixel-sm text-center font-bold text-accent-light">
          ▶ 今日飲食結算
        </p>
        <p className="mt-1 text-center text-sm text-text-muted">
          {data.dietPhaseLabel && (
            <span className="text-accent-light">依{data.dietPhaseLabel}目標 · </span>
          )}
          {data.mealCount} 餐 · 飲水 {data.waterMl} / {data.waterGoalMl} ml
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <div className="border-[3px] border-solid border-border-pixel bg-bg-elevated p-2 text-center">
            <p className="text-xs text-text-muted">熱量</p>
            <p className="font-bold tabular-nums text-accent-light">
              {data.totals.calories}
              <span className="text-xs font-normal text-text-muted">
                /{data.goals.calories}
              </span>
            </p>
          </div>
          <div className="border-[3px] border-solid border-border-pixel bg-bg-elevated p-2 text-center">
            <p className="text-xs text-text-muted">蛋白</p>
            <p className="font-bold tabular-nums">
              {Math.round(data.totals.proteinG)}g
              <span className="text-xs font-normal text-text-muted">
                /{data.goals.proteinG}g
              </span>
            </p>
          </div>
          <div className="border-[3px] border-solid border-border-pixel bg-bg-elevated p-2 text-center">
            <p className="text-xs text-text-muted">碳水</p>
            <p className="font-bold tabular-nums">
              {Math.round(data.totals.carbsG)}g
              <span className="text-xs font-normal text-text-muted">
                /{data.goals.carbsG}g
              </span>
            </p>
          </div>
          <div className="border-[3px] border-solid border-border-pixel bg-bg-elevated p-2 text-center">
            <p className="text-xs text-text-muted">脂肪</p>
            <p className="font-bold tabular-nums text-[#e85d75]">
              {Math.round(data.totals.fatG)}g
              <span className="text-xs font-normal text-text-muted">
                /{data.goals.fatG}g
              </span>
            </p>
          </div>
          <div className="border-[3px] border-solid border-border-pixel bg-bg-elevated p-2 text-center">
            <p className="text-xs text-text-muted">鈉</p>
            <p
              className={`font-bold tabular-nums ${
                data.totals.sodiumMg > data.goals.sodiumMg
                  ? "text-danger"
                  : "text-[#f59e0b]"
              }`}
            >
              {Math.round(data.totals.sodiumMg)}
              <span className="text-xs font-normal text-text-muted">
                /{data.goals.sodiumMg}mg
              </span>
            </p>
          </div>
          <div className="border-[3px] border-solid border-border-pixel bg-bg-elevated p-2 text-center">
            <p className="text-xs text-text-muted">膳食纖維</p>
            <p
              className={`font-bold tabular-nums ${
                data.totals.fiberG >= data.goals.fiberG
                  ? "text-accent-light"
                  : data.totals.fiberG < data.goals.fiberG * 0.7
                    ? "text-danger"
                    : "text-[#f59e0b]"
              }`}
            >
              {Math.round(data.totals.fiberG)}g
              <span className="text-xs font-normal text-text-muted">
                /{data.goals.fiberG}g
              </span>
            </p>
          </div>
          <div className="border-[3px] border-solid border-border-pixel bg-bg-elevated p-2 text-center col-span-2 sm:col-span-3">
            <p className="text-xs text-sky-400">飲水</p>
            <p className="font-bold tabular-nums text-sky-300">
              {data.waterMl}
              <span className="text-xs font-normal text-text-muted">
                /{data.waterGoalMl}ml（{data.waterPct}%）
              </span>
            </p>
          </div>
        </div>

        {data.meals.length > 0 && (
          <div className="mt-3 border-[3px] border-solid border-border-pixel bg-bg-elevated p-2">
            <p className="text-xs font-semibold text-accent-light">今日餐點</p>
            <ul className="mt-1 max-h-24 overflow-y-auto text-xs text-text-muted">
              {data.meals.map((m, i) => (
                <li key={i}>
                  {m.foodName} · {m.calories} kcal · P{Math.round(m.proteinG)}g
                  · 纖維{Math.round(m.fiberG ?? 0)}g · 鈉{Math.round(m.sodiumMg ?? 0)}mg
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-center text-sm leading-relaxed text-text">
          {data.summary}
        </p>
        {coachReply && coachReply !== data.summary && (
          <p className="mt-2 text-center text-xs text-text-muted">
            {coachReply}
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
