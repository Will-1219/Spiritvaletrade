# ARCHITECTURE.md — ValeTrade 系統架構

## 總覽

```
┌─────────────────────┐        ┌──────────────────────────────┐
│  Desktop Companion  │        │  External Reference Source   │
│  (Tauri2/Rust/React)│        │  (spiritvalemarket.com 等)    │
│  Tray·F8·ROI·OCR    │        └──────────────┬───────────────┘
└─────────┬───────────┘                offline│import (feature-flagged)
          │ structured listing JSON           ▼
          ▼                        ┌──────────────────────┐
┌─────────────────────┐           │  reference-importer  │
│    ValeTrade API    │◄──publish─│ fetch→snapshot→parse │
│  (services/api)     │           │ →canonicalize→validate│
└─────────┬───────────┘           │ →diff→review→publish  │
          │                       └──────────────────────┘
          ▼
┌─────────────────────┐    ┌──────────┐  ┌────────────┐
│     PostgreSQL      │◄───│ matching │  │price-engine│
│ (Supabase 第一版)    │    │  (WTB)   │  │(comparables)│
└─────────┬───────────┘    └──────────┘  └────────────┘
          ▼
┌─────────────────────┐
│  Web (Next.js/TS/   │  Marketplace · Search · WTB · Seller Contact
│  Tailwind/shadcn)   │  · Analytics · Sponsored · PRO
└─────────────────────┘
```

## 鐵律

1. Runtime 絕不依賴外部網站。玩家搜尋只打 ValeTrade DB，永不即時 scrape。
2. Reference data 只能經過 importer pipeline（fetch → raw snapshot → parse → canonicalize → validate → diff → review → publish）進入 production。
3. Desktop 禁止：memory reading、DLL injection、packet sniffing、DirectX injection、遊戲自動化、auto click/trade、anti-cheat bypass。
4. 螢幕擷取只限 cursor ROI 與 tooltip crop，upload 前玩家可預覽並可選擇不上傳圖片。
5. Sponsored 不得偷偷影響 organic ranking。
6. 權限用 entitlement，不 hard-code 在 UI。

## Stack

| 層 | 技術 |
|---|---|
| Desktop | Tauri 2 · Rust · React · TypeScript（Win10/11）|
| OCR | PaddleOCR（local，en + zh-TW）+ SpiritVale vocabulary dictionary |
| Web | Next.js · TypeScript · Tailwind · shadcn/ui |
| API/DB | PostgreSQL（第一版 Supabase）|
| Search | PostgreSQL → 成熟後 Typesense/Meilisearch |
| Storage | Cloudflare R2 相容 |

## Desktop F8 workflow

Detect SpiritVale foreground window → cursor position → capture bounded ROI → tooltip detection → crop → local OCR → parse → reference match（exact → normalized → fuzzy + confidence）→ Preview（Item/Refine/Stats/Cards/Gems/Sockets/Quantity/Confidence）。低 confidence 強制 Player Review，不得直接刊登。

## Services

- `services/reference-importer` — ISourceAdapter：SpiritValeMarketAdapter（feature flag OFF，見 DATA_SOURCE_REVIEW.md）、ManualSourceAdapter（POC 使用中）、FutureOfficialSourceAdapter。每次 import 產生 Added/Changed/Removed/Unknown diff；重大變更進 Admin Review Queue，不直接覆蓋 production；保留 historical record（ReferenceVersion）。
- `services/parser` — OCR text → structured item（refine、stats、cards、gems、sockets）。
- `services/matching` — WTB matching engine → notifications。
- `services/price-engine` — ComparableListingsPriceEstimator（第一版不做 ML）。

## Listing 生命週期

ACTIVE → RESERVED / SOLD / EXPIRED / CANCELLED。所有 listing 有 TTL（24/48/72h），到期前推播「Still available?」，一鍵 YES 延長，無回應則 EXPIRED。
