# 推上 GitHub + 修好 Railway 502（照順序做）

## 步驟一：把程式推上 GitHub（`git push`）

「推上 GitHub」= 讓 Railway / Netlify 能從 `jun821007/Gym` 拉到最新檔案（含 `Dockerfile`）。

### 方法 A：用 PowerShell（你已經有 git）

1. 按 **Win**，輸入 **PowerShell**，Enter 開啟。
2. **整段複製貼上**下面兩行（一次一行也可以）：

```powershell
cd c:\Users\rsz97\gym
git push origin main
```

3. 可能出現的情況：

| 畫面 | 你要做什麼 |
|------|------------|
| 跳出瀏覽器要你登入 GitHub | 登入帳號 **jun821007**，按授權 |
| 問 Username / Password | Username 填 `jun821007`；Password **不是** GitHub 密碼，要用 **Token**（見下方「若 push 要密碼」） |
| 顯示 `Everything up-to-date` | **已成功**，直接做步驟二 |
| 顯示 `b7c1931..xxx  main -> main` | **已成功**，直接做步驟二 |
| 紅字 `could not read Username` | 用下面「方法 B」或「若 push 要密碼」 |

### 怎麼確認 push 成功？

1. 瀏覽器開：https://github.com/jun821007/Gym  
2. 看檔案列表是否有 **`Dockerfile`**（在根目錄，和 `backend` 資料夾同一層）  
3. 點進 `backend` 資料夾，也要有 **`Dockerfile`**

有這兩個檔 = GitHub 已是新版，Railway 才能用 Dockerfile 建置。

### 若 push 要密碼（Token 做法）

1. 瀏覽器開：https://github.com/settings/tokens  
2. **Generate new token (classic)**  
3. Note 隨便填，例如 `gym-push`  
4. 勾選 **`repo`**  
5. Generate → **複製那一串**（只顯示一次）  
6. 回到 PowerShell 再執行 `git push origin main`  
7. Password 貼上剛複製的 Token（貼上時畫面可能沒字，正常）

### 方法 B：GitHub Desktop（不想打指令）

1. 下載安裝：https://desktop.github.com/  
2. 開啟 → **File → Add local repository**  
3. 選資料夾：`c:\Users\rsz97\gym`  
4. 左側若有變更：下方 Summary 填 `deploy fix`，按 **Commit to main**  
5. 按上方 **Push origin**  
6. 同樣到 https://github.com/jun821007/Gym 確認有根目錄 `Dockerfile`

---

## 步驟二：Railway 設定（修 502）

1. 開 https://railway.app → 登入 → 點專案 **Gym**  
2. 點服務 **Gym**（只有一個服務就點那個）  
3. 上方點 **Settings**（不是 Variables）

### 3.1 Root Directory（最重要）

往下找到 **Root Directory**：

- 填 **`backend`**（小寫，不要 `/`，不要 `frontend`）  
- 按 **Save** 或勾選後自動存

### 3.2 Builder

同一頁或 **Build** 區塊：

- **Builder** 選 **Dockerfile**（不要 Nixpacks / Railpack）

### 3.3 Variables（你已做對）

**Variables** 分頁只要：

- `GEMINI_API_KEY`  
- `CORS_ORIGINS` = `https://bucolic-arithmetic-1cae20.netlify.app,http://localhost:3000`  

**不要**自己新增 `PORT`。

### 3.4 重新部署

1. 點 **Deployments**  
2. 右上角 **⋯** → **Redeploy**  
3. 等 2～5 分鐘，狀態變 **Active**（綠色）

### 3.5 看日誌（判斷有沒有真的啟動）

1. 點最新一筆 Deployment  
2. 看 **Deploy Logs** 最後幾行，要有類似：

```text
API http://0.0.0.0:8080
```

若是 **Crashed** 或最後是紅色錯誤，把**最後 15 行**截圖傳給協助者。

---

## 步驟三：測試

瀏覽器開（整段複製）：

```
https://gym-production-830b.up.railway.app/health
```

成功應看到：

```json
{"ok":true}
```

根網址也應可開：

```
https://gym-production-830b.up.railway.app/
```

---

## 日誌有 `API http://0.0.0.0:8080` 但瀏覽器仍 502（最常見原因）

**Networking 的 Port 和 Deploy log 的 PORT 不一致。**

例如：

- Deploy log：`API http://0.0.0.0:8080` → 程式聽 **8080**
- Networking 顯示：`→ Port 5678` → 網域轉到 **5678** → **一定 502**

### 修正（30 秒）

1. Railway → **Gym** → **Settings** → **Networking**
2. 在網域 `gym-production-xxxx.up.railway.app` 那一行，點 **Port 5678**（或旁邊編輯）
3. 改成 **`8080`**（和 Deploy log 裡的數字**完全一樣**）
4. 存檔後瀏覽器開：`https://你的網域.up.railway.app/health` → 應為 `{"ok":true}`

若沒法改 Port：刪除網域 → **Generate Domain** → 確認新網域旁 Port 是 **8080**（或與 log 一致）。

---

## 舊說明：重綁網域（Port 已對仍 502 時才做）

1. Railway → 服務 **Gym** → **Settings**
2. 往下 **Networking** / **Public Networking**
3. 確認 **Public Networking 是開啟**
4. 在現有網域 `gym-production-830b.up.railway.app` 旁：
   - 先 **Delete** 刪掉舊網域  
   - 再按 **Generate Domain** 產生**新網址**
5. 複製**新網址**測試：`https://新網址.up.railway.app/health`
6. 若成功，到 Netlify 環境變數把 `NEXT_PUBLIC_API_URL` 和 Railway `CORS_ORIGINS` 改成新網址

### 再確認 Port（若有這欄）

Networking 裡若有 **Port / Target port**：

- 留 **空**（自動），或填 **`8080`**（要和 log 裡 PORT 一致）
- **不要**填 `3001`

### 然後 push + Redeploy

```powershell
cd c:\Users\rsz97\gym
git add backend/src/index.js backend/railway.toml backend/railway.json railway.toml
git commit -m "Fix Railway health probe and routing"
git push origin main
```

Railway 會自動 deploy；完成後再測 `/health`。

---

## 仍 502 時檢查清單

| 檢查 | 正確值 |
|------|--------|
| Root Directory | `backend` |
| Builder | Dockerfile |
| 最新 Deployment | Active（不是 Crashed） |
| GitHub 有根目錄 Dockerfile | 有 |
| Deploy log 結尾 | 有 `API http://0.0.0.0:xxxx` |
| 網域 | Networking 已 Generate，且 Public 開啟 |
| 瀏覽器網址 | 用 **Networking 顯示的最新網域**，不要打錯舊的 |

---

## 步驟四：Netlify（前端，之後再做）

舊站 Package 鎖 `frontend/` → **新建 Netlify site**，Build 四欄全留空，靠根目錄 `netlify.toml`。

`NEXT_PUBLIC_API_URL` 填：`https://gym-production-830b.up.railway.app`（不要結尾 `/`）
