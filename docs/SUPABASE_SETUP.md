# SUPABASE_SETUP.md — 啟用市集刊登（5 分鐘）

市集程式碼已完成並上線,只差一個免費資料庫。照做即可:

## 1. 建立 Supabase 專案

1. 開 https://supabase.com → **Sign in with GitHub**
2. **New project** → 名稱 `valetrade` → Database Password 隨便設一組(記下來)→ Region 選 **Tokyo (ap-northeast-1)**(離台灣最近)→ Create
3. 等 1-2 分鐘專案就緒

## 2. 建立資料表

1. 左邊選單 **SQL Editor** → **New query**
2. 打開專案資料夾 `infra\database\migrations\002_listings.sql`,全選複製貼進去
3. 按 **Run** → 顯示 Success 即可

## 3. 把金鑰接到 Vercel

1. Supabase 左下 **Project Settings → API**:
   - 複製 **Project URL**(https://xxxx.supabase.co)
   - 複製 **service_role** 的 secret key(⚠️ 不是 anon key)
2. 開 https://vercel.com/will-ai-desk/spiritvaletrade/settings/environment-variables
3. 新增兩個變數(Environment 全勾):
   - `SUPABASE_URL` = 剛才的 Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = 剛才的 service_role key
4. **Deployments → 最新一筆 → ⋯ → Redeploy**

完成後 https://spiritvaletrade.vercel.app/market 就能刊登了。

## 安全設計

- service_role key 只存在 Vercel 伺服器端,瀏覽器永遠拿不到
- listings 資料表開了 RLS 且無 policy → 任何人都無法繞過網站直連資料庫
- 賣家管理碼(manage_token)只在刊登成功當下顯示一次,公開查詢永不回傳
