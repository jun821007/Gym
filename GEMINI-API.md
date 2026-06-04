# Gemini API 設定（2026 年 6 月）

## 你現在的錯誤代表什麼？

```json
"Your API key was reported as leaked. Please use another API key."
```

Google 偵測到金鑰曾出現在公開處（例如 GitHub），會**永久停用該把金鑰**。  
換同一把或只改最後幾碼都沒用，必須用**全新產生的金鑰**。

本專案早期曾把金鑰寫進 `backend/.env.example` 並 push 到 GitHub，因此觸發外洩判定。

---

## 正確做法（照順序）

### 1. 到 Google AI Studio 建立新金鑰

1. 開啟：https://aistudio.google.com/apikey  
2. 登入你的 Google 帳號  
3. 點 **Create API key**（可選新專案或既有專案）  
4. **複製**以 `AIza` 開頭的金鑰（只顯示一次）

官方說明：[Gemini API 快速開始](https://ai.google.dev/gemini-api/docs/quickstart)

### 2. 刪除舊的外洩金鑰

在同一頁 **API keys** 列表，刪除已標示外洩/停用的舊金鑰。

### 3. 只放在 Railway（不要進 Git）

1. Railway → 服務 **Gym** → **Variables**  
2. `GEMINI_API_KEY` = 貼**新金鑰**  
   - 不要加引號 `"`  
   - 前後不要空格  
3. **Redeploy**，等 **Active**

本機測試才用 `backend/.env`（此檔已在 `.gitignore`，不會被 commit）。

### 4. 驗證 AI 是否正常

瀏覽器開（換成你的 Railway 網址）：

```
https://gym-production-813d.up.railway.app/health/ai
```

成功範例：

```json
{"ok":true,"model":"gemini-2.5-flash","sample":{...}}
```

失敗會顯示具體原因（金鑰、配額、模型等）。

---

## 2026 年建議使用的模型（本專案已設定）

| 用途 | 模型 ID | 狀態 |
|------|---------|------|
| InBody / 訓練 / 飲食圖片 | `gemini-2.5-flash` | Stable（首選） |
| 備援 | `gemini-2.5-flash-lite` | 更便宜、較快 |
| 備援 | `gemini-3.5-flash` | 較新 stable |

**已停用勿用：** `gemini-2.0-flash`、`gemini-1.5-flash`（2026/6 起會 404）

參考：[Gemini 模型一覽](https://ai.google.dev/gemini-api/docs/models)、[版本說明](https://ai.google.dev/gemini-api/docs/models#model-versions)

可在 Railway 加選用變數（非必須）：

```
GEMINI_MODEL=gemini-2.5-flash
```

---

## 安全提醒（避免再外洩）

- 不要把金鑰寫進：`.env.example`、`README`、截圖、Discord、Cursor 聊天  
- 不要 commit `backend/.env`  
- 若金鑰曾貼在聊天裡，視同外洩，立刻在 AI Studio **刪除並重建**

若新建金鑰仍 403「project denied」，可能是帳號被暫時限制，需到論壇回報：  
https://discuss.ai.google.dev/t/403-permission-denied-on-new-gemini-api-projects-and-keys/140734

---

## API 端點（給開發者）

- Base URL：`https://generativelanguage.googleapis.com`  
- SDK：本專案使用 `@google/genai`（npm）  
- 認證：Header `x-goog-api-key` 或環境變數 `GEMINI_API_KEY`
