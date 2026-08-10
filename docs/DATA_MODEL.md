# DATA_MODEL.md — ValeTrade 資料模型

資料分兩類：**REFERENCE DATA**（canonical 遊戲資料，由 importer pipeline 維護）與 **MARKET DATA**（由 ValeTrade 玩家行為累積，永遠優先自己累積）。

## Canonical ID 規則

禁止用英文名稱當 primary key。使用 stable canonical key：`ITEM_TITANPLATE`、`CARD_NIGHT_FIEND`、`GEM_ECHO`。格式：`^(ITEM|CARD|GEM|ARTIFACT|MATERIAL|CONSUMABLE)_[A-Z0-9_]+$`。DB 內部另有 UUID `id`；canonical_key 唯一且不可變。

## Reference tables（Phase 1 已實作，見 infra/database/migrations/）

### game_items

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid PK | 內部 ID |
| canonical_key | text UNIQUE NOT NULL | `ITEM_TITANPLATE` |
| name_en / name_zh_tw | text | 顯示名稱 |
| category | text | equipment / card / gem / material / consumable / artifact |
| subcategory | text | armor / weapon / accessory … |
| equipment_slot | text NULL | body / weapon / ring … |
| rarity | text NULL | common / rare / epic … |
| description | text NULL | |
| source | text | manual / spiritvalemarket / official |
| source_external_id | text NULL | 來源方 ID |
| source_url | text NULL | |
| source_checked_at | timestamptz NULL | |
| source_hash | text NULL | 來源紀錄 hash（change detection）|
| active | boolean default true | |
| created_at / updated_at | timestamptz | |

### attributes

| 欄位 | 說明 |
|---|---|
| id / canonical_key | `STR`、`MAX_HP`、`FIRE_RESISTANCE` … |
| name_en / name_zh_tw | |
| value_type | flat / percent / boolean / enum / text |
| searchable | boolean |
| refine_scalable | boolean |

初始字典：STR VIT DEX AGI INT、MAX_HP MAX_MP、ATK MATK DEF MDEF、REFLECT_DAMAGE、HEALTH_ON_HIT、ATTACK_SPEED、MOVEMENT_SPEED、CRITICAL_CHANCE、FIRE_RESISTANCE、HOLY_RESISTANCE、BLEED_IMMUNITY、VULNERABILITY_IMMUNITY。

### item_base_attributes

item 的基礎屬性（reference），`(item_id, attribute_id) → value_num / value_text`。attribute 永不寫死成 listings/game_items 的 columns。

### reference_versions / reference_changes

每次 import 產生 `reference_versions`（例 `2026-08-10`）與 `reference_changes`（item_key、change_type NEW/UPDATED/REMOVED、old_hash、new_hash、payload diff、review_status PENDING/APPROVED/REJECTED）。Echo Gem 效果變更這類事件不得靜默覆蓋，需留 historical record 並過 Admin Review Queue。

## Market tables（Phase 7+，schema 先定義）

- `listings` — seller、item(fk game_items)、server、price_gold、refine、quantity、status(ACTIVE/RESERVED/SOLD/EXPIRED/CANCELLED)、verified_capture、capture_edited、ocr_confidence、created_at、updated_at、expires_at(TTL 24/48/72h)。
- `listing_attributes` — (listing_id, attribute_id, value_num/value_text)，支援任意 attribute 搜尋（AND/OR/MIN/MAX）。
- `listing_cards` / `listing_gems` — 插卡與寶石（slot_index, card/gem item fk）。
- `listing_images` — tooltip crop（玩家可選不上傳）。
- `listing_price_history` — 改價紀錄。
- `listing_events` — created / price_changed / sold / expired / favorited / viewed / contacted。
- `wtb_orders` + `wtb_criteria` — Want To Buy 條件（attribute 條件式），matching engine 對新 listing 觸發通知。
- `trade_requests` — buyer→seller contact（Accept / Reject / Already Sold）。

## Market intelligence（衍生）

Median asking/sold price、listing volume、demand/supply index、time-to-sell、7d/30d change。全部從自家 listing_events 聚合。

## 搜尋範例（目標能力）

Armor、Refine ≥ 8、MAX_HP ≥ 8%、(VIT ≥ 10 OR STR ≥ 10)、Sockets ≥ 2、Price ≤ 20M — 以 listing_attributes JOIN 組合，不限 item name。
