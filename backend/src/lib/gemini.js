import { GoogleGenAI, Type } from "@google/genai";

let client;

function readApiKey() {
  const raw = process.env.GEMINI_API_KEY ?? "";
  const key = raw.trim().replace(/^["']|["']$/g, "");
  if (!key) throw new Error("GEMINI_API_KEY 未設定");
  return key;
}

export function getGemini() {
  if (!client) {
    client = new GoogleGenAI({ apiKey: readApiKey() });
  }
  return client;
}

export const INBODY_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    weight_kg: { type: Type.NUMBER, description: "體重 kg" },
    body_fat_pct: { type: Type.NUMBER, description: "體脂率 %" },
    skeletal_muscle_kg: { type: Type.NUMBER, description: "骨骼肌 kg" },
    bmi: { type: Type.NUMBER, description: "BMI" },
    reply: {
      type: Type.STRING,
      description: "給用戶的繁體中文簡短回覆，2-3句",
    },
  },
  required: ["weight_kg", "body_fat_pct", "reply"],
};
