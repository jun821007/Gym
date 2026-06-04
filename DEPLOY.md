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

### 4. Site URL（登入失敗常見原因）

**Authentication → URL Configuration**：

- **Site URL**：你的 Netlify 網址，例如 `https://bucolic-arithmetic-1cae20.netlify.app`
- **Redirect URLs** 新增同一網址與 `http://localhost:3000`

未設定時可能出現 `Invalid login credentials` 或無法保持登入。

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

**Gemini API（2026）**：詳見 [GEMINI-API.md](./GEMINI-API.md)。  
若 `/health/ai` 顯示 `leaked`：金鑰已外洩停用，必須在 [AI Studio](https://aistudio.google.com/apikey) **新建**金鑰，更新 Railway `GEMINI_API_KEY` 後 Redeploy。  
模型使用 `gemini-2.5-flash`（勿用已停用的 `gemini-2.0-flash`）。

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

### Netlify — Package / Publish 鎖在 `frontend/` 改不了

這是**舊站**被 Next 範本鎖死，請**新建 Netlify site**（同一 GitHub repo），不要改舊站 UI。

| 新站 Build 欄位 | 值 |
|----------------|-----|
| Base / Package / Publish / Build command | **全部留空** |

只靠 repo **根目錄** `netlify.toml`（`base=frontend`、`publish=.next`）。  
已刪除 `frontend/netlify.toml` 避免衝突。

### Railway 502 Application failed to respond

**最常見原因：Variables 裡手動設了 `PORT=3001`** → Railway 代理連不到。請在 Variables **刪掉 `PORT`**，只留 Railway 自動注入的。

1. **Settings → Root Directory** = `backend`（或留空，用 repo 根目錄 `Dockerfile`）
2. **Variables**（只要這兩個，不要 PORT）：
   - `GEMINI_API_KEY`
   - `CORS_ORIGINS=https://你的-netlify網址.app`
3. **Deployments** 最新一筆要是 **Active**（Crashed = 看 Deploy logs 最後幾行錯誤）
4. Deploy logs 結尾要有：`API http://0.0.0.0:8080`（數字依 Railway 而定）
5. 測試：`https://gym-production-830b.up.railway.app/health` → `{"ok":true}`

改完 **Redeploy**。若仍 502：Settings → Builder 選 **Dockerfile**，再 Redeploy。

**GitHub 需有最新檔**（本機 push）：

```powershell
cd c:\Users\rsz97\gym
git add Dockerfile railway.toml backend/Dockerfile backend/railway.json DEPLOY.md
git commit -m "Railway root Dockerfile fallback and deploy docs"
git push
```

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
