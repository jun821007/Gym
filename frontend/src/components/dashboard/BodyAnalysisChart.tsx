"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { InbodyRecord } from "@/lib/types";

interface BodyAnalysisChartProps {
  history: InbodyRecord[];
}

export function BodyAnalysisChart({ history }: BodyAnalysisChartProps) {
  const data = [...history]
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    .map((r) => ({
      date: r.recorded_at.slice(5, 10),
      weight: r.weight_kg,
      fat: r.body_fat_pct ?? null,
      muscle: r.skeletal_muscle_kg ?? null,
    }));

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">尚無歷史數據</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
      <LineChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="#2a3548" strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#8b9cb3", fontSize: 10 }}
          stroke="#2a3548"
        />
        <YAxis
          yAxisId="kg"
          tick={{ fill: "#8b9cb3", fontSize: 10 }}
          stroke="#2a3548"
          width={32}
          domain={["auto", "auto"]}
        />
        <YAxis
          yAxisId="pct"
          orientation="right"
          tick={{ fill: "#8b9cb3", fontSize: 10 }}
          stroke="#2a3548"
          width={28}
          domain={[0, "auto"]}
        />
        <Tooltip
          contentStyle={{
            background: "#151c28",
            border: "1px solid #2a3548",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(value, name) => {
            const n = Number(value);
            if (name === "體脂") return [`${n}%`, name];
            return [`${n} kg`, name];
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          iconType="line"
        />
        <Line
          yAxisId="kg"
          type="monotone"
          dataKey="weight"
          name="體重"
          stroke="#38b764"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
        <Line
          yAxisId="kg"
          type="monotone"
          dataKey="muscle"
          name="骨骼肌"
          stroke="#5b9cf5"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="fat"
          name="體脂"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
