# REFERENCE_DATA.md — Reference Data Pipeline

## 原則

External Reference Source → Import → Normalize → Validate → ValeTrade Database → Production API。

Runtime 禁止依賴外部網站；禁止玩家搜尋時即時 scrape。

## Adapter 架構

```
ISourceAdapter
├── ManualSourceAdapter          # data/reference/manual/<date>/*.json（POC 使用中）
├── SpiritValeMarketAdapter      # FEATURE FLAG: OFF — 資料使用權未確認（DATA_SOURCE_REVIEW.md）
└── FutureOfficialSourceAdapter  # 官方 API 出現後
```

## Pipeline 階段

1. **fetch** — adapter 取得 raw records；保存 raw snapshot metadata（來源、時間、hash），避免不必要複製網站內容。
2. **parse** — 來源格式 → RawItemRecord。
3. **canonicalize** — 產生/對應 canonical_key、正規化 category/rarity/attribute keys、對應 attribute dictionary。
4. **validate** — schema 驗證：canonical_key 格式、必填欄位、category enum、attribute 存在於 dictionary、value_type 相容、重複 key 偵測。
5. **diff** — 與現有 published catalog 比對，產生 **Added / Changed / Removed / Unknown** 四種 diff（以 source_hash 判斷 Changed）。
6. **review** — 重大變更（UPDATED/REMOVED）進 Admin Review Queue，不得靜默覆蓋 production；全部留 historical record（reference_versions / reference_changes）。
7. **publish** — 寫入 published catalog + DB。

## Change Detection

SpiritVale 更新頻繁。每次 import 建立 ReferenceVersion（如 `2026-08-10`）。範例：Echo Gem 效果由「Double Attack +3% per refine」改為新值 → diff = CHANGED → review queue → 核准後 publish，舊值保留在 reference_changes。

## 授權狀態

- Manual seed（目前）：內部撰寫的 placeholder/樣本資料，僅供 schema 驗證，欄位 `needs_verification: true`，不得當成正確遊戲資料展示給玩家。
- spiritvalemarket.com bulk import：**停用**，待完成授權確認（聯絡站長 LessFluff）與 endpoint 調查。詳見 DATA_SOURCE_REVIEW.md 與 REFERENCE_SOURCE_REPORT.md。
- 圖片/icon：授權未知一律用 placeholder。禁止複製對方 UI、文案、圖示。
