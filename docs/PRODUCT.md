# PRODUCT.md — ValeTrade 產品定義

## 使命

建立 SpiritVale 玩家之間最高效率的第三方物品交易基礎設施。

ValeTrade 不是 Wiki，不是官方 Auction House 的複製品。核心問題：官方 Auction House 在大量商品下無法有效瀏覽高價、特殊隨機屬性、精煉與極品裝備。ValeTrade 讓玩家主動把遊戲內物品建立成可搜尋 Listing。

## 核心流程

SpiritVale → Player hovers item → Global Hotkey (F8) → Desktop 擷取 tooltip ROI → Local OCR → Item recognition → Attribute parsing → Reference DB matching → Listing Preview → 玩家定價 → Upload → Marketplace → 買家搜尋 → 聯絡賣家 → 交易在 SpiritVale 遊戲內完成。

ValeTrade 不執行遊戲交易、不託管資金、不做 RMT。

## 第一階段範圍

包含：Desktop Capture、OCR、Item Parser、Player Listing、Advanced Search、WTB、Price Tracking、Seller Contact、Favorites、Notifications、Sponsored Listings、PRO Subscription、Advertising。

排除（非核心競爭優勢）：Build Planner、Boss Leaderboard、Full World Map、Full Wiki、Damage Calculator、Guide Database。

## 核心 Flywheel

更多玩家 → 更多 F8 Capture → 更多 Listings → 更完整 Search → 更多 Buyers → 更高 Seller Conversion → 更多 Listings → 更好 Price Data → 更準 Price Estimate → 更多玩家。

每個開發決策必須回答：是否增加 Listings / Search Quality / Matching / Market Data / Retention / Revenue？全否 → 延後。

## Milestones

- **Milestone A** — Reference Import POC：Item / Card / Gem Catalog + Attribute Dictionary。
- **Milestone B** — F8 Capture：hover → 截圖 → OCR → 解析 → canonical item → 顯示 Name/Refine/Stats/Cards/Gems/Socket。
- **Milestone C** — Listing 上架 → Web 立即可見 → 另一裝置以 Attribute Search 找到。

三個 Milestone 完成前不做 Monetization。

## Monetization（Milestone C 之後）

Advertising、Sponsored Listings（明確標示，不污染 organic ranking）、PRO Subscription（entitlement-based）。禁止 real-money escrow / RMT / 平台資金託管。

## UX 原則

Fast、Dark mode friendly、Game companion feeling。首屏：Search、Recent Listings、Popular WTB、Market Movers、Trending、Sponsored、Download Desktop Companion。
