interface QuestBarProps {
  questName: string;
  icon: string;
  current: number;
  target: number;
  unit: string;
  progress: number;
  color?: string;
  completed?: boolean;
}

export function QuestBar({
  questName,
  icon,
  current,
  target,
  unit,
  progress,
  color = "#38b764",
  completed,
}: QuestBarProps) {
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-accent-light">
          {icon} {questName}
          {completed && (
            <span className="ml-1 text-xs text-accent">✓</span>
          )}
        </span>
        <span className="text-sm tabular-nums text-text-muted">
          {current}
          {unit} → {target}
          {unit}
        </span>
      </div>
      <div className="pixel-xp-track">
        <div
          className="pixel-xp-fill"
          style={{
            width: `${pct}%`,
            background: completed
              ? "linear-gradient(180deg, #a7f070 0%, #38b764 100%)"
              : `linear-gradient(180deg, #a7f070 0%, ${color} 100%)`,
          }}
        />
      </div>
      <p className="text-right text-sm font-medium text-accent">
        {completed ? "任務完成" : `${pct}%`}
      </p>
    </div>
  );
}
