# DATA_SOURCE_REVIEW.md — 資料來源合規審查

| Source | URL | Data type | Access method | License status | Usage status | Last reviewed |
|---|---|---|---|---|---|---|
| SpiritValeMarket | https://spiritvalemarket.com | Items / Equipment / Cards / Gems / Materials / Monsters / Drops / Maps / stats | 公開 HTTP（SPA 靜態 bundle，實際 endpoint 待瀏覽器確認） | **UNCLEAR** — 無 ToS、無授權聲明；robots.txt 全開放但不等於資料轉載授權；粉絲站（站長 Discord: LessFluff） | **BULK IMPORT DISABLED**（feature flag `SPIRITVALEMARKET_BULK_IMPORT=false`）。僅允許人工少量查證。待聯絡站長取得許可後再審。 | 2026-08-10 |
| SpiritVale 官方 | https://spiritvale.info · Steam app 3767850 | 官方遊戲資料 / 未來 API | 尚無公開 API（spiritvalemarket 亦在等待官方 API） | N/A（未提供） | WATCH — 官方 API 出現即建 FutureOfficialSourceAdapter | 2026-08-10 |
| SpiritValers | https://spiritvalers.com | Monsters / Items / Weapons / Artifacts / Sets / Skills / Maps（自遊戲客戶端萃取） | SPA（hash routing） | 有 ToS：**明文禁止 mass-scrape**（"Do not attempt to break, overload, mass-scrape..."）；資料版權屬遊戲開發商 | **PROHIBITED**（bulk 爬取違反其 ToS）。僅允許一般人工瀏覽查證。不建 adapter。 | 2026-08-10 |
| Valepedia | https://www.valepedia.com | Equipment(576) / Grimoires(71) / Gems(129) / Cards(327) / Artifacts(45) / Skills(390) / Monsters(330) / Maps(58) / 狀態效果 / 多語言名稱 | **公開 JSON**：Nuxt `_payload.json`（equipment，結構化 tuple）+ `/versions/index.json`（遊戲版本 0.30.7/0.30.8/0.30.10）+ server-rendered HTML（cards/gems）+ `_nuxt/*.js` 資料/翻譯 chunks | robots.txt 全開放（`Disallow:` 空）；**無 ToS、無授權聲明**；非官方粉絲站（聯絡：巴哈姆特）；描述文字/圖片為遊戲內容（© 遊戲開發商） | **BULK ACTIVE**（2026-08-10 Will 核准）。已一次性抓取 game version 0.30.10 全量：576 equipment（_payload.json）+ 270 cards + 129 gems（SSR 列表頁）+ 220 條 stat enum，低速（併發4、60-300ms 間隔）、零錯誤、未 bypass 任何防護。只取 factual stats + en/zh-TW 名稱，不搬描述全文與圖片。後續：偵測 /versions/index.json 出現新遊戲版本時才 re-crawl 一次。 | 2026-08-10 |
| Manual seed（內部） | data/reference/manual/ | 樣本 items/cards/gems/attributes | 內部撰寫 | 自有 | ACTIVE（僅 schema 驗證用；`needs_verification: true`，不得作為正確遊戲資料呈現） | 2026-08-10 |

## 規則（全 adapter 適用）

檢查 robots.txt 與 Terms → 優先公開 API/JSON → 不 bypass authentication / rate limit / Cloudflare → 不存取非公開 endpoint → 不做侵入式 reverse engineering → 不複製 UI/文案/圖片/專有圖示（授權未知的圖用 placeholder）。

## 待辦

1. 透過 Discord 聯絡 LessFluff，徵求資料合作或授權（由 Will 執行）。
2. 用真實瀏覽器 DevTools 確認 `/?view=database` 的資料 bundle endpoint 與 schema（見 REFERENCE_SOURCE_REPORT.md）。
3. 追蹤 SpiritVale 官方 API 公告（官方 Discord / Steam news）。
