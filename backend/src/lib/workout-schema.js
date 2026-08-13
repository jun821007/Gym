import { Type } from "@google/genai";

export const WORKOUT_SETTLE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    grade: {
      type: Type.STRING,
      description: "今日訓練評級佔位（系統會覆寫）：SSS+、SSS、SS、S、A、B、C、D",
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
      description:
        "硬派教練評語 3～4 句：肯定今日表現 + 指出可加強的動作／部位 + 下次具體建議（加重、加組、節奏）+ 一句注意事項。禁止談飲食。",
    },
  },
  required: ["grade", "workout_name", "duration_minutes", "summary", "reply"],
};
