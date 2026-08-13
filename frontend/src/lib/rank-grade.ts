import type { RankGrade } from "@/lib/types";

export const RANK_GRADE_BADGE: Record<RankGrade, string> = {
  "SSS+": "bg-amber-400/25 text-amber-200 border-amber-300",
  SSS: "bg-fuchsia-500/25 text-fuchsia-200 border-fuchsia-300",
  SS: "bg-violet-500/25 text-violet-200 border-violet-300",
  S: "bg-accent/30 text-accent-light border-accent-light",
  A: "bg-accent/20 text-accent border-accent",
  B: "bg-sky-500/20 text-sky-300 border-sky-400",
  C: "bg-bg-elevated text-text-muted border-border",
  D: "bg-danger/15 text-danger border-danger",
};

export const WORKOUT_GRADE_META: Record<
  RankGrade,
  { ring: string; glow: string; label: string }
> = {
  "SSS+": {
    ring: "border-amber-300 text-amber-200",
    glow: "shadow-[0_0_48px_rgba(252,211,77,0.55)]",
    label: "神話級訓練",
  },
  SSS: {
    ring: "border-fuchsia-300 text-fuchsia-200",
    glow: "shadow-[0_0_44px_rgba(240,171,252,0.5)]",
    label: "史詩級訓練",
  },
  SS: {
    ring: "border-violet-300 text-violet-200",
    glow: "shadow-[0_0_40px_rgba(196,181,253,0.45)]",
    label: "傳奇級訓練",
  },
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

export function xpForWorkoutGrade(grade: RankGrade | string): number {
  if (grade === "SSS+") return 90;
  if (grade === "SSS") return 75;
  if (grade === "SS") return 60;
  if (grade === "S") return 50;
  if (grade === "A") return 40;
  if (grade === "B") return 30;
  return 20;
}
