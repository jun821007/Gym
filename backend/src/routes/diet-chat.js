import { Router } from "express";
import { geminiErrorMessage, generateJsonContent } from "../lib/gemini-generate.js";
import { DIET_RESPONSE_SCHEMA } from "../lib/diet-schema.js";

const router = Router();

const SYSTEM = `你是「飲食助手」，專精台灣常見餐點營養估算。
規則：
1. 先拆解食物品項與份量，再估算熱量(kcal)、蛋白質(g)、碳水(g)、脂肪(g)、鈉(mg)、膳食纖維(g)。
2. 參考台灣常見份量：白飯一碗≈280kcal/6g蛋白；雞胸便當≈550-700kcal/35-45g蛋白；滷肉飯一碗≈500-650kcal；火鍋肉盤100g≈20-25g蛋白。
3. 用戶有提供份量時優先採用；沒有則假設「一般外食一份」並在 reply 註明假設。
4. 完成後自我檢核：熱量應大致符合 protein×4 + carbs×4 + fat×9（誤差±15%內），不符則修正。
5. 蛋白質勿低估：肉類、蛋、豆製品、乳製品要足量計入。
6. 若問重訓、InBody，簡短拒絕並說「請到對應分頁」。
7. reply 繁體中文，簡短說明品項、份量假設與關鍵數字。`;

function buildParts(message, imageBase64, mimeType) {
  const parts = [];
  if (imageBase64) {
    parts.push({
      inlineData: { mimeType: mimeType || "image/jpeg", data: imageBase64 },
    });
    parts.push({
      text: message?.trim() || "請估算這餐的營養素（含份量假設）。",
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

    const { parsed } = await generateJsonContent({
      contents: [{ role: "user", parts: buildParts(message, imageBase64, mimeType) }],
      systemInstruction: SYSTEM,
      responseSchema: DIET_RESPONSE_SCHEMA,
    });

    let calories = Number(parsed.calories) || 0;
    let protein = Number(parsed.protein) || 0;
    let carbs = Number(parsed.carbs) || 0;
    let fat = Number(parsed.fat) || 0;
    const sodium = Number(parsed.sodium) || 0;
    const fiber = Number(parsed.fiber) || 0;

    const macroKcal = protein * 4 + carbs * 4 + fat * 9;
    if (macroKcal > 0 && calories > 0) {
      const ratio = calories / macroKcal;
      if (ratio < 0.75 || ratio > 1.35) {
        calories = Math.round(macroKcal);
      }
    } else if (macroKcal > 0 && calories <= 0) {
      calories = Math.round(macroKcal);
    }

    res.json({
      reply: parsed.reply,
      food_name: parsed.food_name,
      calories,
      protein,
      carbs,
      fat,
      sodium,
      fiber,
    });
  } catch (err) {
    console.error("[diet-chat]", err);
    const msg = geminiErrorMessage(err, "解析失敗");
    res.status(500).json({ reply: msg, error: msg });
  }
});

export default router;
