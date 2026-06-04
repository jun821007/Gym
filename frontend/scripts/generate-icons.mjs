/**
 * 從來源圖產生 PWA 圖示（192 / 512）與 favicon
 * 用法：node scripts/generate-icons.mjs [來源圖路徑]
 */
import { mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");
const iconsDir = join(publicDir, "icons");
const appDir = join(__dirname, "../src/app");

const defaultSource = join(iconsDir, "app-icon-source.png");
const sourceArg = process.argv[2];
const sourcePath = sourceArg
  ? sourceArg.startsWith("/") || /^[A-Za-z]:/.test(sourceArg)
    ? sourceArg
    : join(process.cwd(), sourceArg)
  : defaultSource;

if (!existsSync(sourcePath)) {
  console.error(`找不到來源圖：${sourcePath}`);
  console.error("請將圖檔放到 public/icons/app-icon-source.png 或傳入路徑");
  process.exit(1);
}

mkdirSync(iconsDir, { recursive: true });

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
];

for (const { name, size } of sizes) {
  await sharp(sourcePath)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toFile(join(iconsDir, name));
  console.log(`✓ public/icons/${name}`);
}

// Next.js App Router 自動讀取
await sharp(sourcePath)
  .resize(512, 512, { fit: "cover", position: "centre" })
  .png()
  .toFile(join(appDir, "icon.png"));

await sharp(sourcePath)
  .resize(180, 180, { fit: "cover", position: "centre" })
  .png()
  .toFile(join(appDir, "apple-icon.png"));

console.log("✓ src/app/icon.png");
console.log("✓ src/app/apple-icon.png");
console.log("完成");
