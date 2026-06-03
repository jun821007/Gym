import { Router } from "express";
import { getGemini } from "../lib/gemini.js";
import { DIET_RESPONSE_SCHEMA } from "../lib/diet-schema.js";

const router = Router();

const SYSTEM = `你是「飲食助手」，只處理餐點與營養估算。
規則：
1. 用戶描述或上傳食物照片時，估算熱量、蛋白質、碳水、脂肪。
2. 若問重訓、InBody，簡短拒絕並說「請到對應分頁」。
3. reply 繁體中文，簡短確認數字。`;

function buildParts(message, imageBase64, mimeType) {
  const parts = [];
  if (imageBase64) {
    parts.push({
      inlineData: { mimeType: mimeType || "image/jpeg", data: imageBase64 },
    });
    parts.push({
      text: message?.trim() || "請估算這餐的營養素。",
    });
  } else {
    parts.push({ text: message?.trim() || "請描述吃了什麼" });
  }
  return parts;
}

router.post("/", async (req, res) => {
  try {
    const { message, imageBase64, mimeType } = req.body ?? {};
    if (!message?.trim() && !imageBase64) {
      return res.status(400).json({ error: "請輸入文字或上傳食物照片" });
    }

    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: buildParts(message, imageBase64, mimeType) }],
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        responseSchema: DIET_RESPONSE_SCHEMA,
      },
    });

    const parsed = JSON.parse(response.text);
    res.json({
      reply: parsed.reply,
      food_name: parsed.food_name,
      calories: Number(parsed.calories) || 0,
      protein: Number(parsed.protein) || 0,
      carbs: Number(parsed.carbs) || 0,
      fat: Number(parsed.fat) || 0,
    });
  } catch (err) {
    console.error("[diet-chat]", err);
    const msg =
      err.message?.includes("GEMINI_API_KEY")
        ? "請在 backend/.env 設定 GEMINI_API_KEY"
        : "解析失敗";
    res.status(500).json({ reply: msg, error: msg });
  }
});

export default router;
