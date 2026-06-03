# 身體管理 — 像素 RPG 風健康管理 Web App

16-bit 復古像素風格的健康管理系統，將真實身體數據與 RPG 角色屬性（STR / VIT / AGI / SAN）連動。

## 技術棧

| 層級 | 技術 | 部署 |
|------|------|------|
| 前端 | Next.js + Tailwind | Netlify |
| 後端 | Node.js + Express | Railway |
| 資料庫 | Supabase (PostgreSQL + Storage) | Supabase Cloud |
| AI | Google Gemini (`@google/genai`) | Railway |
| CI/CD | GitHub Actions | — |

## Monorepo 結構

```
gym/
├── frontend/          # Next.js（身體管理 UI）
├── backend/           # Express API + Gemini 路由
├── supabase/
│   └── migrations/    # SQL 建表腳本
└── README.md
```

## 開發進度

- [x] **Step 1** — Supabase SQL 建表（`supabase/migrations/001_initial_schema.sql`）
- [x] **Step 2** — 前端 Tailwind 像素風 Layout（`frontend/`）
- [x] **Step 3（部分）** — 體態助手 InBody 截圖解析 API（`backend/`）
- [ ] **Step 3（待完成）** — 訓練 / 飲食 / 週評路由

## Step 2：啟動前端（手機優先 + PWA）

```bash
cd frontend
npm run icons    # 首次產生 PWA 圖示
cp .env.local.example .env.local
npm run dev
```

### 加入主畫面（隱藏網址列）

1. 部署到 **HTTPS**（Netlify 正式網域；本機僅能預覽 UI）
2. iPhone Safari：分享 → **加入主畫面**
3. Android Chrome：選單 → **安裝應用程式** 或 **加到主畫面**

`manifest.webmanifest` 已設定 `display: standalone`，從主畫面開啟時不會顯示瀏覽器網址列。

## InBody 截圖自動更新（體態助手）

### 1. 後端

```bash
cd backend
cp .env.example .env
# 編輯 .env：填入 GEMINI_API_KEY、CORS_ORIGINS（含手機 IP:3000）
npm install
npm run dev
```

### 2. 前端

```bash
cd frontend
# .env.local 設定 NEXT_PUBLIC_API_URL=http://你的電腦IP:3001
npm run dev:mobile
```

### 3. 使用

體態分頁 → 💬 體態助手 → 📷 **InBody** → 選擇截圖，AI 解析後自動更新首頁數據與任務進度。

## Step 1：執行 Supabase 遷移

1. 至 [Supabase Dashboard](https://supabase.com/dashboard) 建立專案。
2. 開啟 **SQL Editor**，貼上 `supabase/migrations/001_initial_schema.sql` 並執行。
3. 在 **Authentication → Providers** 啟用 Email（或你偏好的登入方式）。
4. 記下 **Project URL**、**anon key**、**service_role key**（僅後端使用）。

### 資料表一覽

| 表名 | 用途 |
|------|------|
| `users_profile` | 等級、XP、四維屬性、InBody JSON 歷史 |
| `workout_logs` | 重訓打卡 |
| `diet_logs` | 飲食與營養素 |
| `weekly_grades` | 每週 S/A/B/C 評比 |
| `activity_logs` | 步數 / 有氧 / 睡眠（輔助 VIT、AGI） |

### Storage Buckets

- `inbody-reports` — InBody 報告照片
- `diet-photos` — 食物照片

上傳路徑建議：`{user_id}/{timestamp}.{ext}`
