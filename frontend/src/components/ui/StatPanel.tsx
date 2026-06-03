import type { StatKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAT_META: Record<
  StatKey,
  { label: string; color: string; desc: string }
> = {
  str: { label: "STR", color: "var(--str)", desc: "力量·重訓" },
  vit: { label: "VIT", color: "var(--vit)", desc: "體質·睡眠" },
  agi: { label: "AGI", color: "var(--agi)", desc: "敏捷·有氧" },
  san: { label: "SAN", color: "var(--san)", desc: "理智·飲食" },
};

interface StatPanelProps {
  stats: Record<StatKey, number>;
  highlight?: StatKey | null;
}

export function StatPanel({ stats, highlight }: StatPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {(Object.keys(STAT_META) as StatKey[]).map((key) => {
        const meta = STAT_META[key];
        const isHighlight = highlight === key;
        return (
          <div
            key={key}
            className={cn(
              "pixel-box p-2 text-center transition",
              isHighlight && "animate-level-up pixel-box--gold",
            )}
          >
            <p className="text-[8px] text-text-muted">{meta.desc}</p>
            <p
              className="my-1 text-sm"
              style={{ color: meta.color }}
            >
              {meta.label}
            </p>
            <p className="text-[10px]">{stats[key]}</p>
          </div>
        );
      })}
    </div>
  );
}
