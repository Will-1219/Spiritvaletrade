# PROJECT_STATUS.md

更新：2026-08-10（session 1，下午更新：新來源調查 + Valepedia adapter）

## 最新進展（下午）

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
