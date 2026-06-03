import type { BodyTypeResult } from "@/lib/body-type";
import { cn } from "@/lib/utils";

const TYPE_STYLE: Record<BodyTypeResult["code"], { color: string; icon: string }> = {
  C: { color: "text-amber-400", icon: "C" },
  I: { color: "text-sky-400", icon: "I" },
  D: { color: "text-accent-light", icon: "D" },
};

interface BodyTypeBadgeProps {
  bodyType: BodyTypeResult | null;
  compact?: boolean;
  /** 與名稱同一行：僅圖示 + 簡短分型 */
  inline?: boolean;
  className?: string;
}

export function BodyTypeBadge({
  bodyType,
  compact = false,
  inline = false,
  className,
}: BodyTypeBadgeProps) {
  if (!bodyType) {
    return (
      <p
        className={cn(
          inline ? "shrink-0 text-[10px]" : compact ? "text-[11px] leading-snug" : "text-sm",
          "text-text-muted",
          className,
        )}
      >
        {inline || compact ? "C/I/D" : "記錄數據後推算 C / I / D 體態"}
      </p>
    );
  }

  const style = TYPE_STYLE[bodyType.code];

  if (inline) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center gap-1 rounded border border-border-pixel bg-bg-elevated px-1.5 py-0.5",
          className,
        )}
        title={`${bodyType.label} · ${bodyType.title} · 肌${bodyType.smmPct}% 脂${bodyType.bodyFatPct}%`}
      >
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center border border-border-pixel bg-bg-app text-[11px] font-bold",
            style.color,
          )}
          aria-hidden
        >
          {style.icon}
        </span>
        <span className={cn("text-[11px] font-semibold leading-none", style.color)}>
          {bodyType.title}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start",
        compact ? "gap-1.5" : "gap-3",
        className,
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center border-[2px] border-solid border-border-pixel bg-bg-app font-bold",
          compact
            ? "h-9 w-9 text-sm"
            : "h-14 w-14 border-[3px] text-xl",
          style.color,
        )}
        aria-hidden
      >
        {style.icon}
      </span>
      <div className="min-w-0 flex-1">
        {!compact && <p className="text-sm text-text-muted">體態分型</p>}
        <p
          className={cn(
            "font-bold leading-tight",
            compact ? "text-xs" : "text-base",
            style.color,
          )}
        >
          {compact ? bodyType.code : `${bodyType.label} · ${bodyType.title}`}
          {compact && (
            <span className="ml-1 font-normal text-text-muted">
              {bodyType.title}
            </span>
          )}
        </p>
        <p
          className={cn(
            "text-text-muted",
            compact ? "mt-0.5 text-[10px] tabular-nums" : "mt-1 text-sm",
          )}
        >
          肌 {bodyType.smmPct}% · 脂 {bodyType.bodyFatPct}%
        </p>
      </div>
    </div>
  );
}
