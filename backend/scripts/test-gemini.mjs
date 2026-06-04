import "dotenv/config";
import { readFileSync } from "fs";
import { GoogleGenAI } from "@google/genai";

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("Set GEMINI_API_KEY in backend/.env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: key });
const models = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-2.0-flash",
];

for (const model of models) {
  try {
    const r = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: "回覆 JSON: {\"ok\":true}" }] }],
      config: { responseMimeType: "application/json" },
    });
    console.log(model, "OK", (r.text ?? "").slice(0, 80));
  } catch (e) {
    console.log(model, "FAIL", e.message?.slice(0, 120));
  }
}
