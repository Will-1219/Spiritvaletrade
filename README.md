# ValeTrade — 靈谷交易所

SpiritVale Trading Companion. 第三方玩家交易基礎設施：Desktop F8 Capture → OCR → Parser → Reference Matching → Marketplace Listing → Advanced Search → Seller Contact。

ValeTrade 不執行遊戲內交易，不做 RMT，不讀取遊戲記憶體。

## Monorepo

```
apps/          desktop (Tauri2/Rust/React) · web (Next.js) · admin
services/      api · ocr · parser · reference-importer · matching · price-engine
packages/      game-schema · shared-types · i18n · ui · search
infra/         database/migrations · docker
docs/          產品/架構/資料模型/來源審查文件
data/          reference snapshots (manual seed)
tests/         screenshots · ocr · parser · reference · api · e2e
```

## 文件入口

- `docs/PRODUCT.md` — 產品定義
- `docs/ARCHITECTURE.md` — 系統架構
- `docs/DATA_MODEL.md` — 資料模型
- `docs/REFERENCE_DATA.md` — Reference data pipeline
- `docs/REFERENCE_SOURCE_REPORT.md` — spiritvalemarket.com 調查報告
- `docs/DATA_SOURCE_REVIEW.md` — 資料來源合規審查（bulk importer 目前 OFF）
- `docs/PROJECT_STATUS.md` — 目前進度

## 快速開始（Phase 1 POC）

```bash
cd services/reference-importer
npm install
npm test          # pipeline 單元測試
npm run import    # ManualSourceAdapter → canonicalize → validate → diff → publish
npm run db:poc    # 用 PGlite 跑 migrations + 匯入 published catalog 驗證 schema
```
