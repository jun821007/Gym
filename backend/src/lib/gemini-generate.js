import { getGemini } from "./gemini.js";

/** gemini-2.0-flash 已停用，依序嘗試目前可用的模型 */
const MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
];

export async function generateJsonContent({
  contents,
  systemInstruction,
  responseSchema,
}) {
  const ai = getGemini();
  let lastError;

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
        },
      });

      const text = response.text?.trim();
      if (!text) {
        throw new Error("AI 未回傳內容（可能被安全過濾）");
      }

      const parsed = JSON.parse(text);
      return { parsed, model };
    } catch (err) {
      lastError = err;
      console.warn(`[gemini] ${model}:`, err.message);
    }
  }

  throw lastError ?? new Error("AI 服務暫時不可用");
}

export function geminiErrorMessage(err, fallback) {
  const msg = err?.message ?? "";
  if (msg.includes("GEMINI_API_KEY")) {
    return "後端未設定 GEMINI_API_KEY";
  }
  if (/not found|404|discontinued|shut down/i.test(msg)) {
    return "AI 模型已更新，請重新部署後端後再試";
  }
  return fallback;
}
