import { Type } from "@google/genai";

export const DIET_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    food_name: { type: Type.STRING, description: "食物名稱" },
    calories: { type: Type.NUMBER, description: "熱量 kcal" },
    protein: { type: Type.NUMBER, description: "蛋白質 g" },
    carbs: { type: Type.NUMBER, description: "碳水 g" },
    fat: { type: Type.NUMBER, description: "脂肪 g" },
    reply: {
      type: Type.STRING,
      description: "繁體中文簡短回覆，確認已記錄",
    },
  },
  required: ["food_name", "calories", "reply"],
};

export const WEEKLY_EVAL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    grade: {
      type: Type.STRING,
      description: "本週綜合評級，只能是 S、A、B、C",
    },
    summary: {
      type: Type.STRING,
      description: "繁體中文週報，3-5句，含飲食訓練飲水重點",
    },
  },
  required: ["grade", "summary"],
};
