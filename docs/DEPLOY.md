# DEPLOY.md — 把 ValeTrade 網站公開上線

目標：讓全世界都能透過公開網址使用 ValeTrade。全程免費（Vercel 免費方案），約 15 分鐘。

## 需要的帳號（都免費）

1. **GitHub**（存放程式碼）：https://github.com/signup
2. **Vercel**（網站託管，用 GitHub 帳號直接登入）：https://vercel.com/signup

## 上線步驟

### A. 把程式碼放上 GitHub（用 GitHub Desktop,不用打指令）

1. 下載安裝 GitHub Desktop：https://desktop.github.com
2. 登入你的 GitHub 帳號。
3. File → Add local repository → 選 `桌面\ValeTrade` 資料夾。
4. Publish repository → 名稱填 `valetrade` → 勾選 **Keep this code private**（先私有沒關係,Vercel 讀得到）→ Publish。

### B. 部署到 Vercel

1. 到 https://vercel.com → Continue with GitHub 登入。
2. Add New… → Project → 選 `valetrade` repo → Import。
3. **重要設定**：Root Directory 按 Edit → 選 `apps/web`。
4. 其他全部保持預設 → Deploy。
5. 等 1-2 分鐘 → 取得公開網址（例如 `valetrade.vercel.app`）。

之後每次程式碼更新,只要在 GitHub Desktop 按 Commit → Push,Vercel 會自動重新部署。

### C.（之後）自訂網域

Vercel 專案 → Settings → Domains → 加上你買的網域(例如 valetrade.gg)。

## 目前網站內容（v0）

- 首頁:搜尋框、分類統計、精選物品
- 物品資料庫:975 筆(裝備 576/卡片 270/寶石 129),中英文名稱搜尋、分類/部位篩選、**最多三組屬性條件(AND, ≥值)**
- 物品詳情:基礎屬性、精煉成長、來源連結
- 資料來源:`apps/web/data/catalog.json`(由 reference-importer 產出;更新目錄後把新的 catalog.json 複製過來再 push 即可)

## 下一版（需要資料庫）

市集刊登、賣家聯絡、WTB、收藏 → 需要 Supabase(免費方案):屆時 Will 註冊 Supabase 專案,我把 schema migrations 跑上去,網站接上即可。
