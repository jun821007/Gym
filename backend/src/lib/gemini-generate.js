import { getGemini } from "./gemini.js";

const MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
];

function extractJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("AI 回傳格式無法解析");
  }
}

async function callModel(ai, model, contents, systemInstruction, responseSchema) {
  const config = { systemInstruction };
  if (responseSchema) {
    config.responseMimeType = "application/json";
    config.responseSchema = responseSchema;
  }

  const response = await ai.models.generateContent({
    model,
    contents,
    config,
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("AI 未回傳內容（可能被安全過濾）");
  }
  return extractJson(text);
}

export async function generateJsonContent({
  contents,
  systemInstruction,
  responseSchema,
}) {
  const ai = getGemini();
  const jsonHint =
    "只回傳一個 JSON 物件，不要 markdown，不要其他說明文字。";
  const fullSystem = responseSchema
    ? systemInstruction
    : `${systemInstruction}\n${jsonHint}`;

  let lastError;

  for (const model of MODEL_CANDIDATES) {
    for (const useSchema of [true, false]) {
      try {
        const parsed = await callModel(
          ai,
          model,
          contents,
          fullSystem,
          useSchema ? responseSchema : undefined,
        );
        console.log(`[gemini] ok model=${model} schema=${useSchema}`);
        return { parsed, model };
      } catch (err) {
        lastError = err;
        console.warn(
          `[gemini] ${model} schema=${useSchema}:`,
          err.message?.slice(0, 200),
        );
      }
    }
  }

  throw lastError ?? new Error("AI 服務暫時不可用");
}

export function geminiErrorMessage(err, fallback) {
  const msg = String(err?.message ?? "");

  if (/GEMINI_API_KEY|API key|API_KEY_INVALID|401|403/i.test(msg)) {
    return "Gemini API 金鑰無效：請到 Railway Variables 更新 GEMINI_API_KEY（Google AI Studio 重新產生）";
  }
  if (/quota|429|RESOURCE_EXHAUSTED|rate limit/i.test(msg)) {
    return "AI 配額已用完或太頻繁，請稍後再試";
  }
  if (/not found|404|discontinued|shut down|is not supported/i.test(msg)) {
    return "AI 模型不可用，請確認後端已重新部署";
  }
  if (/location|region|PERMISSION_DENIED/i.test(msg)) {
    return "Gemini API 地區或權限限制，請檢查 API 金鑰設定";
  }
  if (msg.length > 0 && msg.length <= 160) {
    return `解析失敗：${msg}`;
  }
  return fallback;
}
