interface NutrientBarProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
  /** 目標為上限（如鈉），超標時顯示警示 */
  limit?: boolean;
}

export function NutrientBar({
  label,
  current,
  goal,
  unit,
  color,
  limit = false,
}: NutrientBarProps) {
  const pct = goal > 0 ? Math.round((current / goal) * 100) : 0;
  const barPct = Math.min(100, pct);
  const over = limit && current > goal;
  const fillColor = over ? "#e85d75" : color;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-text-muted">{label}</span>
        <span className={`tabular-nums ${over ? "text-danger" : "text-text"}`}>
          {Math.round(current)}
          {unit}
          <span className="text-text-muted">
            {" "}
            / {goal}
            {unit}
            {limit ? " 上限" : ""}
          </span>
        </span>
      </div>
      <div className="nutrient-track">
        <div
          className="nutrient-fill"
          style={{ width: `${barPct}%`, backgroundColor: fillColor }}
        />
      </div>
    </div>
  );
}
