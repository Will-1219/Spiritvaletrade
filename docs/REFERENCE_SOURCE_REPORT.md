# REFERENCE_SOURCE_REPORT.md — spiritvalemarket.com 調查報告

調查日期：2026-08-10。方法：一般公開 HTTP 存取（WebFetch）+ robots.txt / sitemap / 公開頁面檢視。未 bypass 任何驗證、rate limit 或防護；未存取非公開 endpoint。

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
