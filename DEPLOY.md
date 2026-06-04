# 身體管理 — 部署與設定（A～G 完成版）

## 一、Supabase

### 1. 執行 SQL（只需成功一次）

在 **SQL Editor** 依序執行（若出現 `already exists` 表示該段已跑過，可跳過該檔或只跑新檔）：

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_water_intake.sql`
3. `supabase/migrations/003_app_data_sync.sql` ← **新增，必跑**

### 2. 啟用 Email 登入

**Authentication → Providers → Email**：開啟 Email。

一人自用建議：**Authentication → Email → 關閉「Confirm email」**，註冊後可直接登入。

### 3. 複製 API 金鑰

**Project Settings → API**：

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 二、本機開發

### backend/.env

```env
PORT=3001
GEMINI_API_KEY=你的金鑰
CORS_ORIGINS=http://localhost:3000
```

### frontend/.env.local

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

```powershell
cd backend && npm run dev
cd frontend && npm run dev
```

---

## 三、雲端部署

### Railway（後端）— 必設子目錄

錯誤 `Railpack could not determine how to build` = **沒指定 backend 目錄**。

1. 打開服務 **Gym** → **Settings**
2. **Root Directory** 填：`backend`（不是留空）
3. **Start Command**：`npm start`
4. **Variables**：`GEMINI_API_KEY`、`CORS_ORIGINS=...`
5. **Redeploy**

### Netlify（前端）— Publish 不能等於 Base

錯誤 `publish directory cannot be the same as the base directory` = **Publish 設錯了**。

**做法 A（建議，用 repo 根目錄的 `netlify.toml`）：**

| Netlify UI 欄位 | 填什麼 |
|-----------------|--------|
| Base directory | **留空** 或 `.` |
| Publish directory | **留空**（刪掉 `frontend`） |
| Build command | 留空（由 netlify.toml 決定） |

**做法 B：**

| 欄位 | 值 |
|------|-----|
| Base directory | `frontend` |
| Publish directory | **留空**（千萬不要填 `frontend`） |

環境變數：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL=https://你的-railway網址`

改完 **Trigger deploy → Clear cache and deploy**。  
部署成功後把 Netlify 網址加回 Railway `CORS_ORIGINS`。

---

## 四、功能對照

| 功能 | 儲存位置 |
|------|----------|
| 登入（可勾選保持登入） | Supabase Auth（localStorage / sessionStorage） |
| 角色、InBody、目標 | `users_profile` |
| 重訓 / 餐點 | `workout_logs` / `diet_logs` |
| 飲水 | `water_logs` + `daily_water_goal_ml` |
| 訓練/飲食日結算歷史 | `workout_daily_settlements` / `diet_daily_settlements` |
| 週評 | `weekly_grades`（按「生成本週 AI 週評」） |

---

## 五、常見問題

**註冊後無法登入**：到 Supabase 關閉 Email 確認，或到信箱點確認連結。

**CORS 錯誤**：Railway `CORS_ORIGINS` 必須含完整 Netlify HTTPS 網址。

**週評失敗**：需設定 `NEXT_PUBLIC_API_URL` 與 `GEMINI_API_KEY`。

**profile 載入失敗**：確認已跑 `003_app_data_sync.sql`。
