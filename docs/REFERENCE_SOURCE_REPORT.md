# REFERENCE_SOURCE_REPORT.md — Reference Source 調查報告

調查日期：2026-08-10（同日補充 spiritvalers.com 與 valepedia.com）。方法：一般公開 HTTP 存取 + 真實瀏覽器（Claude in Chrome）觀察公開 network requests。未 bypass 任何驗證、rate limit 或防護；未存取非公開 endpoint。

## 總結（三站比較）

| | spiritvalemarket.com | spiritvalers.com | **valepedia.com（推薦）** |
|---|---|---|---|
| 型態 | SPA + 靜態 bundle | SPA（hash routing） | Nuxt prerendered（SSR + payload JSON） |
| ToS | 無 | **有，禁止 mass-scrape** | 無 |
| robots.txt | 全開放 | 全開放 | 全開放 |
| 公開結構化資料 | bundle URL 未定位 | 未調查（ToS 已排除） | ✅ `_payload.json` + 版本化 |
| 雙語 en/zh-TW | 部分 | 否（英文為主） | ✅（實為 17 語言） |
| 結論 | 保留觀察 | **不可用（bulk）** | **主要 reference source 候選** |

## valepedia.com（2026-08-10 新增，主要發現）

- **技術架構**：Nuxt 3 prerendered。每個 equipment 詳頁有公開結構化 endpoint：`/database/equipments/<EnglishName>/_payload.json`（devalue 編碼、~2KB、含 schema + tuple：archetypes、characterBound、descriptions(17 語言)、dropChance、element、id、levelRequired、materialId、names、primaryStats、secondaryStats、set、slots(插槽數)、spriteId、substats、type、unique）。stats 內建精煉係數（例 Broad Sword：`Attack +20 +2×refine`、`Block +10%`、`HP +100 & +10%`、`AtkSpd -10%`、3 插槽）。
- **遊戲版本化**：`/versions/index.json` → `["0.30.7","0.30.8","0.30.10"]`，站方追蹤跨版本資料 → 與 ValeTrade ReferenceVersion/diff 設計完美對齊。
- **Cards/Gems**：詳頁/列表為 server-rendered HTML（易 parse）；完整資料集與各語言名稱表打包在 `_nuxt/*.js` chunks。
- **規模**：Equipment 576、Cards 327、Gems 129、Grimoires 71、Artifacts 45、Monsters 330、Maps 58、Skills 390、狀態效果 185。
- **Crawl 成本**：全 catalog ≈ 1,100 詳頁 × ~2KB，1 req/s 一次性 ≈ 20 分鐘，每遊戲版本一次。對站點負載趨近於零。
- **法律**：無 ToS/授權聲明（狀態同 spiritvalemarket）；描述與圖為遊戲內容 © 開發商。策略：只取 factual stats + 名稱（en/zh-TW，OCR 詞庫必需），不搬運描述全文/圖片。
- **POC 已完成**：31 筆（15 gems + 15 cards + Broad Sword full detail）經 ValepediaSourceAdapter（devalue decoder + zh-TW effect parser）→ pipeline 全綠。

## spiritvalers.com（2026-08-10 新增）

粉絲站，資料「extracted from the game client」（版權屬遊戲開發商）。**ToS 明文禁止 mass-scrape** → bulk import PROHIBITED，不建 adapter。有 Discord 社群。價值：確認遊戲資料本源是 client data files。

## 官方資料現況

SpiritVale **沒有公開官方 API**（spiritvalemarket 亦在等待）。「官方完整資料」目前只存在於遊戲客戶端檔案內——依專案規則（禁止侵入式 reverse engineering）不採用。故短期最佳路徑：valepedia（結構化、版本化、雙語）為主 + 玩家 F8 capture 實測資料自我修正；官方 API 出現後切換 FutureOfficialSourceAdapter。

---

# 附錄：spiritvalemarket.com 原始調查（2026-08-10 上午）

## Observed architecture

- **站點性質**：粉絲製作的 SpiritVale companion database（站長 Discord: LessFluff），非官方。功能：Market（vending listings）、Database（items/equipment/cards/gems/materials/monsters）、Map、Leaderboard、Build Planner、Useful Links。
- **前端**：Single Page Application。所有路徑（含不存在的路徑）都回傳同一份 index HTML（catch-all rewrite），視圖以 query param 切換：`/?view=vending|database|map|character|build|resources`。
- **資料載入**：內容由 client-side JS 渲染；靜態 asset 帶 cache-busting 版本參數（`?v=20260608-browsing-update-1`），顯示資料極可能是隨站部署的靜態 JS/JSON bundle，而非動態後端 API。
- **市場價格現況**：站方明示「Market prices are temporarily unavailable」，等待官方 API 或可靠 listing 來源 —— 即 SpiritVale 目前**沒有公開官方 API**，該站的市場資料也停擺中。這正是 ValeTrade 由玩家 F8 capture 自建 market data 的機會驗證。
- **資料新鮮度**：2026-07-18「SpiritVale 1.0 data refresh」；2026-06 有搜尋效能與自動新物品偵測更新。站點維護活躍。

## Public endpoints

| Endpoint | 結果 |
|---|---|
| `/robots.txt` | `User-agent: * / Allow: /`，附 sitemap。對爬蟲完全開放。 |
| `/sitemap.xml` | 存在（以壓縮/二進位回應，工具端未能解碼；待瀏覽器 session 確認內容）。 |
| `/`、`/?view=*` | SPA index HTML。 |
| `/data/items.json`、`/assets/data/items.json`、`/main.js` 等猜測路徑 | 全部回 SPA fallback 或未能取得 —— 實際 bundle 路徑需從 index.html 的 `<script>` 標籤或瀏覽器 DevTools network panel 確認。 |

**未完成項**：實際資料 bundle URL 與 schema 樣本（sample item/card/gem records）。本次工具鏈（WebFetch 轉 markdown 會剝除 script 標籤；Chrome 擴充未連線）無法取得。下一步：在使用者的 Chrome（Claude in Chrome extension）或本機瀏覽器 DevTools 開 `/?view=database`，讀 network requests 即可確定 delivery mechanism（HTML/JSON/API/client bundle）。這是正常的公開流量觀察，不涉及任何 bypass。

## Data categories（站上可見）

Items、Equipment、Cards、Gems、Materials、Monsters、Drop sources、Maps、item stats、refine 相關資訊、market 參考資訊。

## Data freshness / sync strategy

- 站點以「部署版本」更新（cache-busting param 隨更新改變）→ 適合以 **version-stamped snapshot import**（偵測 `?v=` 變化觸發 re-import + diff），而非高頻 crawl。
- ValeTrade 的 ReferenceVersion + Added/Changed/Removed/Unknown diff 設計正好對應。

## Legal / permission questions

1. 無 Terms of Service、無資料授權聲明、無 API 文件 → 大量資料使用權**不明確**。
2. robots.txt 開放 ≠ 授權轉載資料庫內容。
3. 站方資料本身也是從遊戲整理而來（factual game data），但其整理成果與描述文字、圖片可能有著作權。
4. **建議行動**：透過 Discord（LessFluff）聯絡站長，說明 ValeTrade 用途並徵求資料合作/授權；同時關注官方 API 動向（站方自己也在等官方 API）。

## Crawler recommendation

- **目前：不建立 bulk crawler。** SpiritValeMarketAdapter feature flag = OFF。
- 若取得授權：因資料是靜態 bundle，正確做法是低頻（每次站點版本更新時一次）抓取 bundle → snapshot → diff，而非逐頁 crawl。對站點負載趨近於零。
- Runtime 永不即時 scrape。

## Estimated import complexity

低-中。SPA 靜態 bundle 意味著資料大概率是結構化 JSON（一次取得完整 catalog），主要工作在 canonicalize（命名→canonical_key、attribute 對應）與 diff/review 流程 —— Phase 1 POC 已用 ManualSourceAdapter 驗證這條 pipeline，屆時只需新增 adapter 的 fetch/parse 兩段。
