# PROJECT_STATUS.md

更新：2026-08-10（session 1 續：市集刊登 + 漢化補丁整合完成）

## 市集刊登 + 中英雙語 ✅（程式碼完成,待 Will 設定 Supabase 後啟用）

- **SpiritZh 漢化補丁 v3.64.3 整合**:974/975 物品譯名以社群補丁為準(752 筆更新,如 Broad Sword=大劍),修復 5 筆壞名稱(3D Glasses、Red Shell、Corpse Explosion Gem 等);對照子集存 `data/reference/spiritzh/v3.64.3/`(含出處聲明);`applyTranslations.ts` 可重複執行。
- **中英切換**:header 切換鈕(cookie),英文名恆為 canonical(搜尋準確),搜尋中英皆可命中。
- **市集功能**(`/market`):刊登建立(物品自動完成、精煉/數量/時效 24-72h、價格、角色名、聯絡方式)、瀏覽/搜尋、物品頁顯示在售清單+「刊登此物品」、賣家管理碼標記售出/取消、listing_events 記錄。無資料庫 env 時優雅降級。
- **安全**:Supabase service-role 僅存伺服器端;RLS 無 policy 阻擋直連;管理碼只顯示一次。
- Schema:`infra/database/migrations/002_listings.sql`。
- **[Will 行動項]** 照 `docs/SUPABASE_SETUP.md` 建 Supabase(5 分鐘)→ Vercel 加兩個環境變數 → GitHub Desktop Push → Redeploy。

## 🚀 LIVE — https://spiritvaletrade.vercel.app

- GitHub repo:https://github.com/Will-1219/Spiritvaletrade(main branch,Vercel 自動部署:push 即上線)
- Vercel 設定:Root Directory=apps/web、Framework=Next.js
- 線上驗證 ✓:首頁 975 筆、屬性搜尋(裝備+BLOCK≥10+MAX_HP≥10%→闊劍)正確
- 下一步:Supabase(市集刊登/賣家聯絡/WTB)、自訂網域、SpiritVale 社群曝光

## WEB v0 — ValeTrade 網站 ✅（Will 方向確認:網頁優先,桌面 App 暫緩）

- `apps/web/` Next.js 15 + React 19 + Tailwind,深色 game-companion 風格。
- 頁面:首頁(搜尋+分類統計+精選)、物品資料庫(975 筆;中英文搜尋、分類/部位篩選、**三組屬性 AND 條件搜尋**)、物品詳情(基礎屬性/精煉成長/來源)。
- 資料:catalog.json 打包進站(v0 免資料庫);build ✓、本機煙霧測試 ✓(BLOCK≥10+MAX_HP≥10% → 闊劍)。
- **[Will 行動項] 公開上線**:照 `docs/DEPLOY.md`(GitHub Desktop 發布 repo → Vercel Import,Root Directory 設 apps/web)。約 15 分鐘,全程免費。
- 下一版(市集刊登/賣家聯絡/WTB)需要 Supabase — Will 註冊後我接手 schema 與功能。
- 桌面 F8 App(Phase 2)程式碼保留於 apps/desktop,依 Will 指示暫緩 Windows 實測。

## PHASE 2 — Desktop F8 Capture POC ✅（程式碼完成,待 Windows 實測）

- `apps/desktop/` Tauri 2 + Rust + React：
  - **capture-core**（純 Rust crate,無 OS 相依）：cursor ROI 數學(bounded 680×820@1080p、邊界 clamp)+ tooltip 邊界偵測(降採樣暗格 mask → 游標種子 flood fill → bounding box → 矩形度信心分數)。**9/9 tests pass**(含雜訊拒絕、過小面板拒絕、螢幕外游標)。
  - **src-tauri 殼層**：F8 global hotkey(tauri-plugin-global-shortcut)、SpiritVale 前景視窗 gate(Win32 GetForegroundWindow,非遊戲一律拒絕)、xcap 0.9 螢幕擷取、tooltip crop 存 PNG(`%APPDATA%/com.valetrade.companion/captures/`)、事件推送前端。**cargo check 全通過**(Linux target;Windows 分支為標準 Win32 呼叫)。
  - **React 前端**：深色 companion UI,顯示擷取耗時/偵測信心/裁切預覽/歷史,含手動測試按鈕與隱私聲明。
- 隱私規則程式碼強制:非前景遊戲拒絕、只擷取 cursor ROI、整幀立即釋放、本機存檔、Phase 2 無上傳。
- **[Will 行動項] Windows 實測**：`apps/desktop/README.md` 有完整步驟(rustup + Node + VS Build Tools → `npm run tauri dev` → 開 SpiritVale 按 F8)。實測後提供 5-10 張 F8 截圖,用來校準 tooltip 偵測參數並開始 PHASE 3(OCR)。


## 最新進展（晚間：VALEPEDIA 全量匯入完成 ✦）

- Will 核准 valepedia bulk import。經 Chrome 以低速一次性抓取 game version **0.30.10** 全量公開資料：**576 equipment + 270 cards + 129 gems**（+220 stat enum 對照、25 種裝備類型→slot mapping、7 種狀態抗性詞彙），SHA-256 校驗傳輸完整，0 錯誤。
- Bulk parser：devalue payload 解碼、enum-tagged 效果文字解析（base%/per-refine/負值/狀態抗性）、zh/en 名稱拆解（含 7 筆無英文名的 fallback）、重複屬性合併（同鍵數值相加）。
- **Production catalog 現況：975 筆真實 reference items**（虛構 manual 種子已從 production 移除，僅留測試用）。zh-TW 名稱覆蓋 >99%。attribute dictionary 66 條。
- 驗證：測試 9/9 pass；PGlite 真 Postgres 匯入 975 items + 3,400+ attribute rows；進階搜尋demo（weapon AND BLOCK≥10% AND MAX_HP≥10% AND SOCKETS≥3 → 闊劍 Broad Sword）✔
- **Milestone A（Reference Catalog）從 POC 升級為真實資料完成。** 下一步：PHASE 2 Desktop F8 Capture POC。

## 稍早進展（下午）

- **spiritvalers.com**：ToS 明文禁止 mass-scrape → PROHIBITED，不建 adapter。
- **valepedia.com**：★ 找到最佳 reference source。公開 Nuxt `_payload.json` 結構化 endpoint（equipment 含精煉係數 stats、插槽）、`/versions/index.json` 遊戲版本清單（0.30.10 現行）、server-rendered cards/gems、en/zh-TW（實為 17 語）名稱。詳見 REFERENCE_SOURCE_REPORT.md。
- **ValepediaSourceAdapter 完成**：devalue payload decoder + zh-TW effect parser（`攻擊速度: +5% + (1% × 精煉等級)` → ATTACK_SPEED base 5 / per-refine 1；狀態免疫、負值、% vs flat 全處理；不可解析片段保留原文不丟棄）。
- **樣本匯入**：31 筆（15 gems、15 cards、Broad Sword 完整 detail）→ pipeline 全綠 → published catalog 51 items（manual 20 + valepedia 31）→ PGlite DB POC 通過。
- 測試 9/9 pass。attribute dictionary 擴充至 35（新增 BLOCK、HOLY_DAMAGE、SOCKETS、REQUIRED_LEVEL、*_PERCENT、*_FLAT、各種免疫等）。
- Chrome 擴充已連線，瀏覽器輔助調查 workflow 驗證可用。

## 待 Will 決策

**Valepedia bulk import 開關**：技術可行（~1,100 頁 × 2KB、1 req/s 一次跑完 ≈ 20 分鐘、每遊戲版本一次）。該站無 ToS、robots 全開放，但也無明示授權（法律狀態同 spiritvalemarket）。策略已保守化：只取 factual stats + 名稱，不搬描述/圖片。你說可跳過聯絡站長——確認後我就把 bulk fetcher 寫進 adapter 開跑。

## 已完成

### PHASE 0 — Reference Source Investigation ✅

- 建立 monorepo（apps/services/packages/infra/docs/data/tests）與核心文件（PRODUCT / ARCHITECTURE / DATA_MODEL / REFERENCE_DATA）。
- 調查 spiritvalemarket.com（僅公開 HTTP 存取，未 bypass 任何防護）：
  - 粉絲站（站長 Discord: LessFluff），非官方；無 ToS、無授權聲明、無 API 文件。
  - SPA + 靜態資料 bundle（cache-busting `?v=`），所有路徑回傳同一 index HTML；robots.txt 全開放 + sitemap。
  - SpiritVale 目前**無官方 API**（該站市場價格功能也因此停擺）→ 驗證了 ValeTrade 由玩家 F8 capture 自建 market data 的策略。
  - 詳見 `docs/REFERENCE_SOURCE_REPORT.md`。
- 建立 `docs/DATA_SOURCE_REVIEW.md`：spiritvalemarket 授權 UNCLEAR → **bulk importer feature flag OFF**（程式碼層強制，已測試）。

### PHASE 1 — Reference Import POC ✅（Milestone A 達成）

- Schema：`infra/database/migrations/001_reference.sql` — attributes、game_items（canonical_key，非英文名 PK）、item_base_attributes（EAV，不寫死 columns）、reference_versions、reference_changes。
- Attribute Dictionary：`packages/game-schema/attributes.json`（21 attributes，含 zh-TW、value_type、searchable、refine_scalable）。
- `services/reference-importer`（TypeScript）：
  - ISourceAdapter：ManualSourceAdapter（使用中）、SpiritValeMarketAdapter（flag OFF stub）。
  - Pipeline：fetch → snapshot meta → canonicalize（`Night Fiend Card`→`CARD_NIGHT_FIEND`）→ validate（dictionary/型別/重複鍵）→ diff（Added/Changed/Removed/Unknown）→ review gate → publish（catalog + per-version historical diff）。
- Seed：20 筆 manual 樣本（10 items / 5 cards / 5 gems，全部 `needs_verification: true`，僅供 schema 驗證）。
- 驗證結果：
  - 單元測試 6/6 pass（`npm test`）。
  - `npm run import` → 20 items published。
  - `npm run db:poc` → PGlite（真 Postgres）跑 migration + 匯入 + attribute search：`equipment AND VIT>=10 AND MAX_HP>=8%` 正確回傳 Titanplate。
  - Echo Gem 規則：修改 DOUBLE_ATTACK 3→4 → import exit 2（要求 review）→ `--approve` 後 publish 且 `versions/2026-08-11.json` 保留 old/new hash 與值的 historical record。✔ 不靜默覆蓋。

## 待辦 / Blockers

1. **[Will 行動項] 聯絡 spiritvalemarket 站長（Discord: LessFluff）**談資料合作/授權 — bulk import 解鎖的前提。
2. **Endpoint 確認**：需一次真實瀏覽器 session（Claude in Chrome extension 本次未連線）開 `/?view=database` 看 network requests，確認資料 bundle URL 與 schema 樣本 → 補完 REFERENCE_SOURCE_REPORT.md。
3. 追蹤 SpiritVale 官方 API 動向（官方也未提供，spiritvalemarket 在等同一件事）。

## 下一步 — PHASE 2：Desktop F8 Capture POC

Tauri 2 + Rust：SpiritVale window detection → global hotkey F8 → cursor ROI capture → tooltip crop（先存檔，OCR 為 Phase 3）。需在 Windows 環境開發/測試（本 cloud sandbox 為 Linux，可先寫跨平台骨架與 CI，但 hotkey/截圖需 Will 的 Windows 機器驗證）。

## 執行方式

```bash
cd services/reference-importer
npm install && npm test && npm run import && npm run db:poc
```
