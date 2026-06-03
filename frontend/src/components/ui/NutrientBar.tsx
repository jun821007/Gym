interface NutrientBarProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
}

export function NutrientBar({
  label,
  current,
  goal,
  unit,
  color,
}: NutrientBarProps) {
  const pct = Math.min(100, Math.round((current / goal) * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-text-muted">{label}</span>
        <span className="tabular-nums text-text">
          {current}
          {unit}
          <span className="text-text-muted"> / {goal}{unit}</span>
        </span>
      </div>
      <div className="nutrient-track">
        <div
          className="nutrient-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
