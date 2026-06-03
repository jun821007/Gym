import { Router } from "express";
import { getGemini, INBODY_RESPONSE_SCHEMA } from "../lib/gemini.js";

const router = Router();

const SYSTEM = `你是「體態助手」，只處理 InBody 與體態量化數據。
規則：
1. 用戶上傳 InBody 報告截圖時，從圖中讀取體重、體脂率、骨骼肌量、BMI（若有）。
2. 用戶用文字描述數據時，解析數字並填入 JSON。
3. 若用戶問飲食、重訓、菜單，冷酷拒絕並說「請到訓練或飲食分頁」。
4. reply 使用繁體中文，簡短確認已記錄的關鍵數字。
5. 數字欄位只填合理範圍的數值，無法辨識時在 reply 註明。`;

function buildParts(message, imageBase64, mimeType) {
  const parts = [];
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: imageBase64,
      },
    });
    parts.push({
      text:
        message?.trim() ||
        "請解析這張 InBody 報告截圖，提取體重、體脂率、骨骼肌量等數據。",
    });
  } else {
    parts.push({ text: message?.trim() || "請提供體態數據" });
  }
  return parts;
}

router.post("/", async (req, res) => {
  try {
    const { message, imageBase64, mimeType } = req.body ?? {};

    if (!message?.trim() && !imageBase64) {
      return res.status(400).json({ error: "請輸入文字或上傳 InBody 圖片" });
    }

    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: buildParts(message, imageBase64, mimeType) }],
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        responseSchema: INBODY_RESPONSE_SCHEMA,
      },
    });

    const parsed = JSON.parse(response.text);

    const inbodyRecord = {
      recorded_at: new Date().toISOString().slice(0, 10),
      weight_kg: Number(parsed.weight_kg),
      body_fat_pct: Number(parsed.body_fat_pct),
      skeletal_muscle_kg: parsed.skeletal_muscle_kg
        ? Number(parsed.skeletal_muscle_kg)
        : undefined,
      bmi: parsed.bmi ? Number(parsed.bmi) : undefined,
      source: imageBase64 ? "ai_photo" : "manual",
    };

    res.json({
      reply: parsed.reply,
      inbodyRecord,
      profileUpdate: {
        xpGained: imageBase64 ? 35 : 20,
        leveledUp: false,
      },
    });
  } catch (err) {
    console.error("[inbody]", err);
    const msg =
      err.message?.includes("GEMINI_API_KEY")
        ? "請在 backend/.env 設定 GEMINI_API_KEY"
        : "解析失敗，請換清晰截圖或手動輸入數據";
    res.status(500).json({ reply: msg, error: msg });
  }
});

export default router;
