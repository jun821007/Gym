import { Type } from "@google/genai";

export const WORKOUT_SETTLE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    grade: {
      type: Type.STRING,
      description: "今日訓練評級，只能是 S、A、B、C、D",
    },
    workout_name: { type: Type.STRING, description: "訓練類型名稱" },
    duration_minutes: {
      type: Type.NUMBER,
      description: "訓練總時長（分鐘）",
    },
    active_calories: { type: Type.NUMBER, description: "動態大卡" },
    total_calories: { type: Type.NUMBER, description: "總大卡" },
    avg_heart_rate: { type: Type.NUMBER, description: "平均心率 bpm" },
    summary: {
      type: Type.STRING,
      description: "一行繁體中文結算評語",
    },
    reply: {
      type: Type.STRING,
      description: "硬派教練 2 句話以內建議，禁止談飲食",
    },
  },
  required: ["grade", "workout_name", "duration_minutes", "summary", "reply"],
};
