"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { estimateDietNutrition } from "@/lib/diet-api";
import { toDateKey } from "@/lib/datetime";
import {
  combineDateAndTime,
  nowTimeStr,
} from "@/lib/logged-at";
import { mealTypeFromHour } from "@/lib/meal-type";
import type { DietLog } from "@/lib/types";

const MEAL_OPTIONS: { value: NonNullable<DietLog["mealType"]>; label: string }[] = [
  { value: "breakfast", label: "早餐" },
  { value: "lunch", label: "午餐" },
  { value: "dinner", label: "晚餐" },
  { value: "snack", label: "點心" },
];

interface DietAddFormProps {
  defaultDate?: string;
  onSave: (
    log: Omit<DietLog, "id">,
    options?: { addToFavorites?: boolean },
  ) => void | Promise<void>;
}

export function DietAddForm({ defaultDate, onSave }: DietAddFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dateKey, setDateKey] = useState(defaultDate ?? toDateKey());
  const [timeStr, setTimeStr] = useState(nowTimeStr());
  const [mealType, setMealType] = useState<DietLog["mealType"]>(
    mealTypeFromHour(),
  );
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addFavorite, setAddFavorite] = useState(false);
  const [aiReply, setAiReply] = useState("");
  const [preview, setPreview] = useState<{
    foodName: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  } | null>(null);

  async function handleEstimate() {
    if (!text.trim() && !imageFile) {
      alert("請輸入文字或上傳照片");
      return;
    }
    setEstimating(true);
    setAiReply("");
    try {
      const result = await estimateDietNutrition({
        message: text,
        imageFile: imageFile ?? undefined,
      });
      if (result.calories <= 0) {
        throw new Error("AI 無法估算，請描述更清楚或換張照片");
      }
      setPreview({
        foodName: result.foodName,
        calories: result.calories,
        proteinG: result.proteinG,
        carbsG: result.carbsG,
        fatG: result.fatG,
      });
      setAiReply(result.reply);
    } catch (e) {
      alert(e instanceof Error ? e.message : "AI 估算失敗");
    } finally {
      setEstimating(false);
    }
  }

  async function handleSave() {
    if (!preview) return;
    if (!preview.foodName.trim()) {
      alert("請輸入品名");
      return;
    }
    setSaving(true);
    try {
      await onSave(
        {
          foodName: preview.foodName.trim(),
          calories: Math.round(preview.calories),
          proteinG: Number(preview.proteinG) || 0,
          carbsG: Number(preview.carbsG) || 0,
          fatG: Number(preview.fatG) || 0,
          loggedAt: combineDateAndTime(dateKey, timeStr),
          mealType,
        },
        { addToFavorites: addFavorite },
      );
      setText("");
      setImageFile(null);
      setPreview(null);
      setAiReply("");
      setAddFavorite(false);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      alert(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  function updatePreview<K extends keyof NonNullable<typeof preview>>(
    key: K,
    value: NonNullable<typeof preview>[K],
  ) {
    setPreview((p) => (p ? { ...p, [key]: value } : p));
  }

  return (
    <Card title="新增餐點">
      <div className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="描述吃了什麼，例如：雞胸便當、少飯"
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-bg-app px-3 py-2.5 text-base outline-none focus:border-accent"
        />

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="min-h-[40px] rounded-xl border border-border bg-bg-elevated px-3 text-sm font-semibold"
          >
            {imageFile ? `📷 ${imageFile.name.slice(0, 12)}` : "📷 上傳照片"}
          </button>
          {imageFile && (
            <button
              type="button"
              onClick={() => {
                setImageFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="text-xs text-text-muted underline"
            >
              移除
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-text-muted">
            日期
            <input
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
              className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 text-sm"
            />
          </label>
          <label className="text-xs text-text-muted">
            時間
            <input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 text-sm"
            />
          </label>
          <label className="text-xs text-text-muted">
            餐別
            <select
              value={mealType ?? "lunch"}
              onChange={(e) =>
                setMealType(e.target.value as DietLog["mealType"])
              }
              className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 text-sm"
            >
              {MEAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          disabled={estimating || (!text.trim() && !imageFile)}
          onClick={() => void handleEstimate()}
          className="min-h-[44px] w-full rounded-xl border border-accent/50 bg-accent/15 text-sm font-bold text-accent-light disabled:opacity-40"
        >
          {estimating ? "AI 估算中…" : "AI 估算營養"}
        </button>

        {preview && (
          <div className="space-y-3 rounded-xl border border-border bg-bg-elevated p-3">
            {aiReply && (
              <p className="text-xs leading-relaxed text-text-muted">{aiReply}</p>
            )}
            <label className="block text-xs text-text-muted">
              品名
              <input
                value={preview.foodName}
                onChange={(e) => updatePreview("foodName", e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-3 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["calories", "熱量 kcal"],
                  ["proteinG", "蛋白質 g"],
                  ["carbsG", "碳水 g"],
                  ["fatG", "脂肪 g"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-xs text-text-muted">
                  {label}
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={preview[key]}
                    onChange={(e) =>
                      updatePreview(key, Number(e.target.value) || 0)
                    }
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 text-sm tabular-nums"
                  />
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={addFavorite}
                onChange={(e) => setAddFavorite(e.target.checked)}
              />
              加入常吃
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="min-h-[44px] w-full rounded-xl bg-accent text-sm font-bold text-bg-app disabled:opacity-40"
            >
              {saving ? "儲存中…" : "確認儲存"}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
