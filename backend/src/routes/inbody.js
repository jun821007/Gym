import { Router } from "express";
import { INBODY_RESPONSE_SCHEMA } from "../lib/gemini.js";
import {
  geminiErrorMessage,
  generateJsonContent,
} from "../lib/gemini-generate.js";

const router = Router();

const SYSTEM = `你是「體態助手」，只處理 InBody 與體態量化數據。
規則：
1. 用戶上傳 InBody 報告截圖時，從圖中讀取體重、體脂率、骨骼肌量、BMI（若有）。
2. 用戶用文字描述數據時，解析數字並填入 JSON。
3. 若用戶問飲食、重訓、菜單，冷酷拒絕並說「請到訓練或飲食分頁」。
4. reply 使用繁體中文，簡短確認已記錄的關鍵數字。
5. 數字欄位只填合理範圍的數值，無法辨識時在 reply 註明。`;

function normalizeMime(mimeType) {
  const m = (mimeType || "").toLowerCase();
  if (m.includes("heic") || m.includes("heif")) return null;
  if (m === "image/jpg" || m === "image/pjpeg") return "image/jpeg";
  if (m.startsWith("image/")) return m;
  return "image/jpeg";
}

function buildParts(message, imageBase64, mimeType) {
  const parts = [];
  if (imageBase64) {
    const mime = normalizeMime(mimeType);
    if (!mime) {
      throw new Error("HEIC 格式不支援，請用螢幕截圖存成 JPG 再上傳");
    }
    parts.push({
      inlineData: {
        mimeType: mime,
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
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

    const { parsed } = await generateJsonContent({
      contents: [
        { role: "user", parts: buildParts(message, imageBase64, mimeType) },
      ],
      systemInstruction: SYSTEM,
      responseSchema: INBODY_RESPONSE_SCHEMA,
    });

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
    const msg = geminiErrorMessage(
      err,
      err.message?.includes("HEIC")
        ? err.message
        : "解析失敗，請換清晰截圖或手動輸入數據",
    );
    const status = err.message?.includes("HEIC") ? 400 : 500;
    res.status(status).json({ reply: msg, error: msg });
  }
});

export default router;
