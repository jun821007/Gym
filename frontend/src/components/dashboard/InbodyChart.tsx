"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { InbodyRecord } from "@/lib/types";

interface InbodyChartProps {
  history: InbodyRecord[];
}

export function InbodyChart({ history }: InbodyChartProps) {
  const data = history.map((r) => ({
    date: r.recorded_at.slice(5, 10),
    weight: r.weight_kg,
    fat: r.body_fat_pct ?? null,
  }));

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">尚無歷史數據</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={160}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="#2a3548" strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#8b9cb3", fontSize: 11 }}
          stroke="#2a3548"
        />
        <YAxis
          tick={{ fill: "#8b9cb3", fontSize: 11 }}
          stroke="#2a3548"
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: "#151c28",
            border: "1px solid #2a3548",
            borderRadius: 12,
            fontSize: 13,
          }}
        />
        <Line
          type="monotone"
          dataKey="weight"
          name="體重"
          stroke="#38b764"
          strokeWidth={2}
          dot={{ r: 3, fill: "#38b764" }}
        />
        <Line
          type="monotone"
          dataKey="fat"
          name="體脂"
          stroke="#6ee7a0"
          strokeWidth={2}
          dot={{ r: 3, fill: "#6ee7a0" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
