"use client";

import { useMemo, useState } from "react";
import { QuestBar } from "@/components/ui/QuestBar";
import { deriveBodyQuests, questLabelsText } from "@/lib/body-goals";
import type { BodyGoals, InbodyRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BodyGoalsPanelProps {
  goals: BodyGoals;
  latest?: InbodyRecord;
  history: InbodyRecord[];
  onSave: (g: BodyGoals) => void;
}

export function BodyGoalsPanel({
  goals,
  latest,
  history,
  onSave,
}: BodyGoalsPanelProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goals);

  const activeQuests = useMemo(
    () => deriveBodyQuests(goals, latest, history),
    [goals, latest, history],
  );

  const previewQuests = useMemo(
    () => (editing ? deriveBodyQuests(draft, latest, history) : []),
    [editing, draft, latest, history],
  );

  const hasMetrics =
    latest?.weight_kg != null &&
    latest?.body_fat_pct != null;

  function handleSave() {
    onSave(draft);
    setEditing(false);
  }

  return (
    <div className="pixel-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-pixel-sm font-bold text-accent-light">
            ▶ 體態任務
          </h2>
          {!editing && hasMetrics && (
            <p className="mt-1 text-xs text-accent">
              主線：{questLabelsText(activeQuests)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (editing) handleSave();
            else {
              setDraft(goals);
              setEditing(true);
            }
          }}
          className={cn(
            "shrink-0 min-h-[40px] px-3 text-sm font-semibold border-[3px] border-solid border-border-pixel",
            editing
              ? "bg-accent text-bg-app"
              : "bg-bg-elevated text-text-muted",
          )}
        >
          {editing ? "儲存目標" : "設定目標"}
        </button>
      </div>

      {editing ? (
        <div className="space-y-3">
          <p className="text-xs text-text-muted">
            填寫目標後，系統會依現況自動啟動「減重 / 減脂 / 增肌」任務
          </p>
          {(
            [
              ["targetWeightKg", "目標體重", "kg"],
              ["targetBodyFatPct", "目標體脂", "%"],
              ["targetMuscleKg", "目標骨骼肌", "kg"],
            ] as const
          ).map(([key, label, unit]) => (
            <label key={key} className="block">
              <span className="text-sm text-text-muted">
                {label} ({unit})
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={draft[key]}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    [key]: Number(e.target.value) || 0,
                  }))
                }
                className="mt-1 min-h-[48px] w-full border-[3px] border-solid border-border-pixel bg-bg-app px-3 text-base tabular-nums outline-none focus:border-accent"
              />
            </label>
          ))}
          <p className="rounded-lg bg-bg-elevated px-3 py-2 text-xs text-accent-light">
            儲存後預計主線：
            {previewQuests.length > 0
              ? questLabelsText(previewQuests)
              : latest?.weight_kg
                ? "（與現況相同，無需減重/減脂/增肌）"
                : "減重 · 減脂 · 增肌（待有體態數據後精準判斷）"}
          </p>
        </div>
      ) : !hasMetrics ? (
        <p className="py-4 text-center text-sm text-text-muted">
          請先在體態助手記錄數據，任務會依目標自動顯示進度
        </p>
      ) : activeQuests.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm font-medium text-accent-light">
            目標已達成或未設定減重/減脂/增肌方向
          </p>
          <p className="mt-1 text-xs text-text-muted">
            調整目標：例如目標體重低於現況→減重，目標體脂更低→減脂，目標肌肉更高→增肌
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {activeQuests.map((q) => (
            <QuestBar
              key={q.type}
              questName={q.label}
              icon={q.icon}
              current={q.current}
              target={q.target}
              unit={q.unit}
              progress={q.progress}
              color={q.color}
              completed={q.completed}
            />
          ))}
        </div>
      )}
    </div>
  );
}
