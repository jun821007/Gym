"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { estimateDietNutrition } from "@/lib/diet-api";
import { toDateKey } from "@/lib/datetime";
import { combineDateAndTime } from "@/lib/logged-at";
import { defaultTimeForMealType, mealTypeFromHour } from "@/lib/meal-type";
import type { DietLog, FavoriteMeal } from "@/lib/types";

const PORTION_OPTIONS = [
  { value: "", label: "未指定（AI 假設一般份量）" },
  { value: "小份", label: "小份" },
  { value: "一般份量", label: "一般份量" },
  { value: "大份", label: "大份" },
  { value: "半碗飯", label: "半碗飯" },
  { value: "一碗飯", label: "一碗飯" },
  { value: "自訂（見描述）", label: "自訂（見描述）" },
];

const MEAL_OPTIONS: { value: NonNullable<DietLog["mealType"]>; label: string }[] = [
  { value: "breakfast", label: "早餐" },
  { value: "lunch", label: "午餐" },
  { value: "dinner", label: "晚餐" },
  { value: "snack", label: "點心" },
];

interface DietAddFormProps {
  defaultDate?: string;
  favorites?: FavoriteMeal[];
  onSave: (
    log: Omit<DietLog, "id">,
    options?: { addToFavorites?: boolean; favoriteBundleName?: string },
  ) => void | Promise<void>;
}

export function DietAddForm({
  defaultDate,
  favorites = [],
  onSave,
}: DietAddFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [portion, setPortion] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dateKey, setDateKey] = useState(defaultDate ?? toDateKey());
  const [mealType, setMealType] = useState<DietLog["mealType"]>(
    mealTypeFromHour(),
  );
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addFavorite, setAddFavorite] = useState(false);
  const [bundleMode, setBundleMode] = useState<"existing" | "new">("existing");
  const [existingBundle, setExistingBundle] = useState("");
  const [newBundleName, setNewBundleName] = useState("");
  const [aiReply, setAiReply] = useState("");
  useEffect(() => {
    if (defaultDate) setDateKey(defaultDate);
  }, [defaultDate]);

  const existingBundlesForMeal = useMemo(() => {
    const names = new Set<string>();
    for (const fav of favorites) {
      const name = fav.bundleName?.trim();
      if (!name) continue;
      if ((fav.defaultMealType ?? "lunch") !== (mealType ?? "lunch")) continue;
      names.add(name);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "zh-TW"));
  }, [favorites, mealType]);

  useEffect(() => {
    if (existingBundlesForMeal.length === 0) {
      setBundleMode("new");
      setExistingBundle("");
      return;
    }
    setBundleMode("existing");
    setExistingBundle((prev) =>
      prev && existingBundlesForMeal.includes(prev)
        ? prev
        : existingBundlesForMeal[0],
    );
  }, [existingBundlesForMeal]);

  const [preview, setPreview] = useState<{
    foodName: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    sodiumMg: number;
    fiberG: number;
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
        portion: portion || undefined,
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
        sodiumMg: result.sodiumMg,
        fiberG: result.fiberG,
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
    let favoriteBundleName: string | undefined;
    if (addFavorite) {
      favoriteBundleName =
        bundleMode === "existing"
          ? existingBundle.trim()
          : newBundleName.trim();
      if (!favoriteBundleName) {
        alert(
          bundleMode === "existing"
            ? "請選擇要加入的套餐"
            : "請輸入套餐名稱（例如：早餐A）",
        );
        return;
      }
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
          sodiumMg: Math.round(Number(preview.sodiumMg) || 0),
          fiberG: Math.round(Number(preview.fiberG) || 0),
          loggedAt: combineDateAndTime(
            dateKey,
            defaultTimeForMealType(mealType),
          ),
          mealType,
        },
        {
          addToFavorites: addFavorite,
          favoriteBundleName,
        },
      );
      setText("");
      setImageFile(null);
      setPreview(null);
      setAiReply("");
      setAddFavorite(false);
      setNewBundleName("");
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

        <label className="block text-xs text-text-muted">
          份量
          <select
            value={portion}
            onChange={(e) => setPortion(e.target.value)}
            className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-app px-2 text-sm"
          >
            {PORTION_OPTIONS.map((o) => (
              <option key={o.value || "default"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
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
                  ["sodiumMg", "鈉 mg"],
                  ["fiberG", "膳食纖維 g"],
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
              加入常吃套餐
            </label>
            {addFavorite && (
              <div className="space-y-2 rounded-lg border border-border bg-bg-app p-2.5">
                <p className="text-xs text-text-muted">
                  同一套餐名稱的品項會歸在同一組，之後可一次新增多品。
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={existingBundlesForMeal.length === 0}
                    onClick={() => setBundleMode("existing")}
                    className={`min-h-[36px] flex-1 rounded-lg border text-xs font-semibold disabled:opacity-40 ${
                      bundleMode === "existing"
                        ? "border-accent bg-accent/20 text-accent-light"
                        : "border-border text-text-muted"
                    }`}
                  >
                    加入既有套餐
                  </button>
                  <button
                    type="button"
                    onClick={() => setBundleMode("new")}
                    className={`min-h-[36px] flex-1 rounded-lg border text-xs font-semibold ${
                      bundleMode === "new"
                        ? "border-accent bg-accent/20 text-accent-light"
                        : "border-border text-text-muted"
                    }`}
                  >
                    建立新套餐
                  </button>
                </div>
                {bundleMode === "existing" ? (
                  <label className="block text-xs text-text-muted">
                    選擇套餐
                    <select
                      value={existingBundle}
                      onChange={(e) => setExistingBundle(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-elevated px-2 text-sm"
                    >
                      {existingBundlesForMeal.length === 0 ? (
                        <option value="">此餐期尚無套餐</option>
                      ) : (
                        existingBundlesForMeal.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                ) : (
                  <label className="block text-xs text-text-muted">
                    新套餐名稱（必填）
                    <input
                      value={newBundleName}
                      onChange={(e) => setNewBundleName(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-border bg-bg-elevated px-3 text-sm"
                      placeholder="例如：增肌早餐 / 外食午餐A"
                    />
                  </label>
                )}
              </div>
            )}
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
