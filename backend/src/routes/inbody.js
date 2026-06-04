import { Router } from "express";
import { INBODY_RESPONSE_SCHEMA } from "../lib/gemini.js";
import {
  geminiErrorMessage,
  generateJsonContent,
} from "../lib/gemini-generate.js";

const router = Router();

const SYSTEM = `你是「體態助手」，只處理 InBody 與體態量化數據。
規則：
1. 用戶上傳 InBody 報告（App 截圖或紙本拍照）時，從圖中讀取：
   - weight_kg：體重 (kg)
   - body_fat_pct：體脂率 / PBF / 體脂肪率 (%)
   - skeletal_muscle_kg：骨骼肌量 / SMM (kg)
   - bmi：BMI（若有）
2. 紙本報告常見欄位：Weight、PBF、SMM、體重、體脂肪率、骨骼肌重。
3. 用戶用文字描述時，解析數字並填入 JSON。
4. 若用戶問飲食、重訓、菜單，冷酷拒絕並說「請到訓練或飲食分頁」。
5. reply 使用繁體中文，簡短確認已記錄的關鍵數字。
6. 數字欄位只填合理範圍；無法辨識時 weight_kg、body_fat_pct 仍須給最佳估計。`;

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

    const weight = Number(parsed.weight_kg);
    const bodyFat = Number(parsed.body_fat_pct);
    if (!Number.isFinite(weight) || !Number.isFinite(bodyFat)) {
      throw new Error(
        "無法從圖片讀取體重或體脂率，請換更清晰截圖或手動輸入",
      );
    }

    const inbodyRecord = {
      recorded_at: new Date().toISOString().slice(0, 10),
      weight_kg: weight,
      body_fat_pct: bodyFat,
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
