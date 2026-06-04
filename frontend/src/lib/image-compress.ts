/** 上傳前壓縮，避免過大或 HEIC 導致 AI 解析失敗 */
export async function fileToCompressedBase64(
  file: File,
  maxSide = 1600,
  quality = 0.82,
): Promise<{ base64: string; mimeType: string }> {
  const type = (file.type || "").toLowerCase();
  if (type.includes("heic") || type.includes("heif")) {
    throw new Error("iPhone 原檔 HEIC 不支援，請用「螢幕截圖」存成 JPG 再上傳");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("讀取圖片失敗"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("無法載入圖片，請換 JPG/PNG"));
    el.src = dataUrl;
  });

  let { width, height } = img;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法處理圖片");
  ctx.drawImage(img, 0, 0, width, height);

  const jpeg = canvas.toDataURL("image/jpeg", quality);
  const base64 = jpeg.split(",")[1];
  if (!base64) throw new Error("圖片壓縮失敗");

  return { base64, mimeType: "image/jpeg" };
}
