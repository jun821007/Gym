import { fileToCompressedBase64 } from "@/lib/image-compress";

export interface DietEstimate {
  foodName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sodiumMg: number;
  reply: string;
}

export async function estimateDietNutrition(input: {
  message?: string;
  portion?: string;
  imageFile?: File;
}): Promise<DietEstimate> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
  if (!apiBase) throw new Error("請設定 NEXT_PUBLIC_API_URL");

  let imageBase64: string | undefined;
  let mimeType: string | undefined;
  if (input.imageFile) {
    const compressed = await fileToCompressedBase64(input.imageFile);
    imageBase64 = compressed.base64;
    mimeType = compressed.mimeType;
  }

  const base = input.message?.trim() ?? "";
  const portion = input.portion?.trim() ?? "";
  const message = portion
    ? `${base}${base ? "\n" : ""}【份量】${portion}`
    : base;
  if (!message && !imageBase64) {
    throw new Error("請輸入文字或上傳照片");
  }

  const res = await fetch(`${apiBase}/api/chat/diet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, imageBase64, mimeType }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.reply ?? data.error ?? "AI 估算失敗");
  }

  return {
    foodName: data.food_name ?? "未知食物",
    calories: Number(data.calories) || 0,
    proteinG: Number(data.protein) || 0,
    carbsG: Number(data.carbs) || 0,
    fatG: Number(data.fat) || 0,
    sodiumMg: Number(data.sodium) || 0,
    reply: data.reply ?? "",
  };
}
