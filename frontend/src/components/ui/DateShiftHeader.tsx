"use client";

import { formatDateLabel, toDateKey } from "@/lib/datetime";

interface DateShiftHeaderProps {
  dateKey: string;
  onChange: (dateKey: string) => void;
  title: string;
}

export function DateShiftHeader({
  dateKey,
  onChange,
  title,
}: DateShiftHeaderProps) {
  function shift(delta: number) {
    const d = new Date(dateKey + "T12:00:00");
    d.setDate(d.getDate() + delta);
    onChange(toDateKey(d));
  }

  const today = toDateKey();
  const label =
    dateKey === today ? title : `${formatDateLabel(dateKey)} ${title}`;

  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => shift(-1)}
        className="min-h-[40px] shrink-0 rounded-lg border border-border px-3 text-sm"
        aria-label="前一天"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => {
          const picked = prompt("輸入日期 (YYYY-MM-DD)", dateKey);
          if (picked && /^\d{4}-\d{2}-\d{2}$/.test(picked)) onChange(picked);
        }}
        className="min-w-0 flex-1 text-center"
      >
        <h2 className="card-title mb-0 truncate">{label}</h2>
        {dateKey !== today && (
          <p className="mt-0.5 text-xs text-text-muted">{dateKey}</p>
        )}
      </button>
      <button
        type="button"
        onClick={() => shift(1)}
        disabled={dateKey >= today}
        className="min-h-[40px] shrink-0 rounded-lg border border-border px-3 text-sm disabled:opacity-35"
        aria-label="後一天"
      >
        ›
      </button>
    </div>
  );
}
