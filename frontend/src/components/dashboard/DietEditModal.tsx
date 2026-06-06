"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  combineDateAndTime,
  extractDateKey,
  extractTimeStr,
} from "@/lib/logged-at";
import type { DietLog } from "@/lib/types";
import type { WaterLogEntry } from "@/lib/water-intake";

const MEAL_OPTIONS: { value: NonNullable<DietLog["mealType"]>; label: string }[] = [
  { value: "breakfast", label: "早餐" },
  { value: "lunch", label: "午餐" },
  { value: "dinner", label: "晚餐" },
  { value: "snack", label: "點心" },
];

type DietEditModalProps =
  | {
      kind: "meal";
      item: DietLog;
      onSave: (log: Omit<DietLog, "id">) => void | Promise<void>;
      onClose: () => void;
    }
  | {
      kind: "water";
      item: WaterLogEntry;
      onSave: (patch: {
        amountMl: number;
        logDate: string;
        loggedAt: string;
      }) => void | Promise<void>;
      onClose: () => void;
    };

export function DietEditModal(props: DietEditModalProps) {
  const [saving, setSaving] = useState(false);

  const [mealDraft, setMealDraft] = useState(() =>
    props.kind === "meal"
      ? {
          foodName: props.item.foodName,
          calories: props.item.calories,
          proteinG: props.item.proteinG,
          carbsG: props.item.carbsG,
          fatG: props.item.fatG,
          sodiumMg: props.item.sodiumMg ?? 0,
          dateKey: extractDateKey(props.item.loggedAt),
          timeStr: extractTimeStr(props.item.loggedAt),
          mealType: props.item.mealType ?? ("lunch" as DietLog["mealType"]),
        }
      : null,
  );

  const [waterDraft, setWaterDraft] = useState(() =>
    props.kind === "water"
      ? {
          amountMl: props.item.amountMl,
          dateKey: props.item.logDate,
          timeStr: extractTimeStr(props.item.loggedAt),
        }
      : null,
  );

  async function handleSubmit() {
    setSaving(true);
    try {
      if (props.kind === "meal" && mealDraft) {
        await props.onSave({
          foodName: mealDraft.foodName.trim(),
          calories: Math.round(mealDraft.calories),
          proteinG: mealDraft.proteinG,
          carbsG: mealDraft.carbsG,
          fatG: mealDraft.fatG,
          sodiumMg: Math.round(mealDraft.sodiumMg) || 0,
          loggedAt: combineDateAndTime(mealDraft.dateKey, mealDraft.timeStr),
          mealType: mealDraft.mealType,
        });
      } else if (props.kind === "water" && waterDraft) {
        await props.onSave({
          amountMl: waterDraft.amountMl,
          logDate: waterDraft.dateKey,
          loggedAt: combineDateAndTime(waterDraft.dateKey, waterDraft.timeStr),
        });
      }
      props.onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <div
        role="dialog"
        className="w-full max-w-md rounded-2xl border border-border bg-bg-card p-4 shadow-xl"
      >
        <h3 className="mb-3 text-sm font-bold text-accent-light">
          {props.kind === "meal" ? "編輯餐點" : "編輯喝水"}
        </h3>

        {props.kind === "meal" && mealDraft && (
          <div className="space-y-3">
            <input
              value={mealDraft.foodName}
              onChange={(e) =>
                setMealDraft((d) => d && { ...d, foodName: e.target.value })
              }
              className="min-h-[44px] w-full rounded-xl border border-border bg-bg-app px-3"
              placeholder="品名"
            />
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["calories", "熱量"],
                  ["proteinG", "蛋白質"],
                  ["carbsG", "碳水"],
                  ["fatG", "脂肪"],
                  ["sodiumMg", "鈉 mg"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-xs text-text-muted">
                  {label}
                  <input
                    type="number"
                    min={0}
                    value={mealDraft[key]}
                    onChange={(e) =>
                      setMealDraft(
                        (d) =>
                          d && { ...d, [key]: Number(e.target.value) || 0 },
                      )
                    }
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 tabular-nums"
                  />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="date"
                value={mealDraft.dateKey}
                onChange={(e) =>
                  setMealDraft((d) => d && { ...d, dateKey: e.target.value })
                }
                className="min-h-[40px] rounded-lg border border-border bg-bg-app px-2 text-sm"
              />
              <input
                type="time"
                value={mealDraft.timeStr}
                onChange={(e) =>
                  setMealDraft((d) => d && { ...d, timeStr: e.target.value })
                }
                className="min-h-[40px] rounded-lg border border-border bg-bg-app px-2 text-sm"
              />
              <select
                value={mealDraft.mealType}
                onChange={(e) =>
                  setMealDraft(
                    (d) =>
                      d && {
                        ...d,
                        mealType: e.target.value as DietLog["mealType"],
                      },
                  )
                }
                className="min-h-[40px] rounded-lg border border-border bg-bg-app px-2 text-sm"
              >
                {MEAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {props.kind === "water" && waterDraft && (
          <div className="space-y-3">
            <label className="block text-xs text-text-muted">
              毫升
              <input
                type="number"
                min={1}
                max={5000}
                value={waterDraft.amountMl}
                onChange={(e) =>
                  setWaterDraft(
                    (d) =>
                      d && { ...d, amountMl: Number(e.target.value) || 0 },
                  )
                }
                className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-bg-app px-3 tabular-nums"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={waterDraft.dateKey}
                onChange={(e) =>
                  setWaterDraft((d) => d && { ...d, dateKey: e.target.value })
                }
                className="min-h-[40px] rounded-lg border border-border bg-bg-app px-2 text-sm"
              />
              <input
                type="time"
                value={waterDraft.timeStr}
                onChange={(e) =>
                  setWaterDraft((d) => d && { ...d, timeStr: e.target.value })
                }
                className="min-h-[40px] rounded-lg border border-border bg-bg-app px-2 text-sm"
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={props.onClose}
            className="min-h-[44px] flex-1 rounded-xl border border-border bg-bg-elevated text-sm"
          >
            取消
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit()}
            className="min-h-[44px] flex-1 rounded-xl bg-accent text-sm font-bold text-bg-app disabled:opacity-40"
          >
            {saving ? "儲存中…" : "儲存"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
