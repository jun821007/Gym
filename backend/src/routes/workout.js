import { Router } from "express";
import { geminiErrorMessage, generateJsonContent } from "../lib/gemini-generate.js";
import {
  formatBodyMetricsPrompt,
  formatTodayLogsPrompt,
} from "../lib/workout-prompt.js";
import { WORKOUT_SETTLE_SCHEMA } from "../lib/workout-schema.js";

const router = Router();

const SYSTEM = `你是「地下城健身教練」，負責「今日訓練結算評分」。
輸入包含：(A) 健身 App 截圖 (B) 今日重訓清單 (C) 用戶體態（體重、體脂、骨骼肌、C/I/D 分型）。

評級必須 A+B+C 三者綜合，且 C（體重）用於個人化門檻，禁止用固定絕對值評所有人：
1. 截圖：訓練類型、時長(分鐘)、動態大卡、總大卡、心率。
2. 清單：動作數、總訓練量；計算 訓練量÷體重 作為相對強度。
3. 體重個人化：
   - 動態大卡÷體重(kcal/kg)：≥4.5 優、3.2-4.4 良、<2.5 低
   - 訓練量÷體重：≥1.2 優、0.9-1.19 良、<0.6 低
4. 基礎等級後依清單與相對強度微調（±1級，S上限）。
5. summary 必須寫明體重、相對訓練量、動態大卡/體重。
6. reply 最多2句，禁止飲食。`;

function buildParts(message, imageBase64, mimeType, logsPrompt) {
  const text = `${logsPrompt}\n\n${message?.trim() || "請解析健身截圖並綜合今日清單評分。"}`;
  const parts = [];
  if (imageBase64) {
    parts.push({
      inlineData: { mimeType: mimeType || "image/jpeg", data: imageBase64 },
    });
    parts.push({ text });
  } else {
    parts.push({ text });
  }
  return parts;
}

function normalizeGrade(g) {
  const u = String(g || "C").toUpperCase();
  return ["S", "A", "B", "C", "D"].includes(u) ? u : "C";
}

router.post("/", async (req, res) => {
  try {
    const { message, imageBase64, mimeType, todayLogs, bodyMetrics } =
      req.body ?? {};

    if (!imageBase64) {
      return res.status(400).json({
        error: "請貼上或上傳健身截圖",
        reply: "請貼上健身 App 結算截圖後再評分。",
      });
    }

    const logsPrompt = formatTodayLogsPrompt(todayLogs);
    const bodyPrompt = formatBodyMetricsPrompt(bodyMetrics);
    const fullPrompt = `${bodyPrompt}\n\n${logsPrompt}`;

    const { parsed } = await generateJsonContent({
      contents: [
        {
          role: "user",
          parts: buildParts(message, imageBase64, mimeType, fullPrompt),
        },
      ],
      systemInstruction: SYSTEM,
      responseSchema: WORKOUT_SETTLE_SCHEMA,
    });
    const grade = normalizeGrade(parsed.grade);

    const manualLogs = Array.isArray(todayLogs)
      ? todayLogs.map((l) => {
          const setLines = Array.isArray(l.set_lines)
            ? l.set_lines.map((sl) => ({
                weightKg: Number(sl.weight) || 0,
                reps: Number(sl.reps) || 0,
              }))
            : undefined;
          const volumeKg =
            Number(l.volume) ||
            (setLines?.length
              ? setLines.reduce((s, x) => s + x.weightKg * x.reps, 0)
              : (Number(l.weight) || 0) *
                (Number(l.reps) || 0) *
                (Number(l.sets) || 0));
          return {
            exerciseName: l.name,
            weightKg: Number(l.weight) || 0,
            reps: Number(l.reps) || 0,
            sets: Number(l.sets) || 0,
            setLines,
            volumeKg,
            loadType: l.load_type ?? undefined,
          };
        })
      : [];

    const totalVolumeKg = manualLogs.reduce(
      (s, l) => s + (l.volumeKg ?? l.weightKg * l.reps * l.sets),
      0,
    );

    const settlement = {
      grade,
      workoutName: parsed.workout_name || "今日訓練",
      durationMinutes: Number(parsed.duration_minutes) || 0,
      activeCalories: Number(parsed.active_calories) || 0,
      totalCalories: Number(parsed.total_calories) || 0,
      avgHeartRate: Number(parsed.avg_heart_rate) || 0,
      summary: parsed.summary || "訓練結算完成",
      logDate: new Date().toISOString().slice(0, 10),
      loggedAt: new Date().toISOString(),
      manualLogs,
      totalVolumeKg,
      bodyWeightKg: bodyMetrics?.weight_kg ?? null,
      volumePerBodyWeight: bodyMetrics?.volume_per_body_weight ?? null,
    };

    res.json({
      reply: parsed.reply,
      settlement,
      profileUpdate: {
        xpGained:
          grade === "S" ? 50 : grade === "A" ? 40 : grade === "B" ? 30 : 20,
      },
    });
  } catch (err) {
    console.error("[workout]", err);
    const msg = geminiErrorMessage(err, "解析失敗，請換清晰截圖重試");
    res.status(500).json({ reply: msg, error: msg });
  }
});

export default router;
