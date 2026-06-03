import type { InbodyRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BodyMetricsProps {
  latest?: InbodyRecord;
  compact?: boolean;
  className?: string;
}

export function BodyMetrics({
  latest,
  compact = false,
  className,
}: BodyMetricsProps) {
  const items = [
    { label: "體重", value: latest?.weight_kg, unit: "kg" },
    { label: "體脂", value: latest?.body_fat_pct, unit: "%" },
    { label: "骨骼肌", value: latest?.skeletal_muscle_kg, unit: "kg" },
  ];

  return (
    <div className={cn("grid grid-cols-3", compact ? "gap-1" : "gap-2", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "border-solid border-border-pixel bg-bg-elevated text-center",
            compact
              ? "border-[2px] px-0.5 py-1.5"
              : "border-[3px] px-1 py-3",
          )}
        >
          <p
            className={cn(
              "text-text-muted",
              compact ? "text-[10px]" : "text-sm",
            )}
          >
            {item.label}
          </p>
          <p
            className={cn(
              "font-bold tabular-nums text-accent-light",
              compact ? "mt-0.5 text-sm" : "mt-1 text-lg",
            )}
          >
            {item.value != null ? item.value : "—"}
            <span
              className={cn(
                "font-normal text-text-muted",
                compact ? "ml-0.5 text-[10px]" : "ml-0.5 text-sm",
              )}
            >
              {item.unit}
            </span>
          </p>
        </div>
      ))}
    </div>
  );
}
