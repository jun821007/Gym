import { Router } from "express";
import { getGemini } from "../lib/gemini.js";
import { WEEKLY_EVAL_SCHEMA } from "../lib/diet-schema.js";

const router = Router();

const SYSTEM = `你是健康管理週報教練。根據用戶一週的飲食、飲水、訓練結算摘要，給出 S/A/B/C 綜合評級（S 最佳）與繁體中文週報。
必須綜合：餐點紀錄、每日飲食結算、飲水量、訓練結算。飲水不足要扣分。`;

function normalizeGrade(g) {
  const u = String(g || "C").toUpperCase();
  return ["S", "A", "B", "C"].includes(u) ? u : "C";
}

router.post("/eval", async (req, res) => {
  try {
    const { weekLabel, snapshot } = req.body ?? {};
    if (!snapshot) {
      return res.status(400).json({ error: "缺少 snapshot" });
    }

    const prompt = `週次：${weekLabel ?? "本週"}\n\n資料 JSON：\n${JSON.stringify(snapshot, null, 2)}\n\n請輸出 grade 與 summary。`;

    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        responseSchema: WEEKLY_EVAL_SCHEMA,
      },
    });

    const parsed = JSON.parse(response.text);
    const grade = normalizeGrade(parsed.grade);

    res.json({
      grade,
      summary: parsed.summary ?? "本週紀錄已結算。",
      weekLabel,
    });
  } catch (err) {
    console.error("[weekly/eval]", err);
    res.status(500).json({
      error: err.message || "週評失敗",
      summary: "週評產生失敗，請稍後再試。",
    });
  }
});

export default router;
