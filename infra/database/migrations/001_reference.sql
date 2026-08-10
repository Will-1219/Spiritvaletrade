-- ValeTrade reference schema (Phase 1)
-- Target: PostgreSQL (Supabase-compatible). Validated in POC via PGlite.

-- gen_random_uuid() is built-in since PostgreSQL 13 (no pgcrypto needed).

CREATE TABLE attributes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_key text NOT NULL UNIQUE CHECK (canonical_key ~ '^[A-Z0-9_]+$'),
  name_en       text NOT NULL,
  name_zh_tw    text,
  value_type    text NOT NULL CHECK (value_type IN ('flat','percent','boolean','enum','text')),
  searchable    boolean NOT NULL DEFAULT true,
  refine_scalable boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE game_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_key      text NOT NULL UNIQUE
                     CHECK (canonical_key ~ '^(ITEM|CARD|GEM|ARTIFACT|MATERIAL|CONSUMABLE)_[A-Z0-9_]+$'),
  name_en            text NOT NULL,
  name_zh_tw         text,
  category           text NOT NULL CHECK (category IN
                     ('equipment','card','gem','artifact','material','consumable')),
  subcategory        text,
  equipment_slot     text,
  rarity             text,
  description        text,
  source             text NOT NULL,          -- manual | spiritvalemarket | official
  source_external_id text,
  source_url         text,
  source_checked_at  timestamptz,
  source_hash        text,
  needs_verification boolean NOT NULL DEFAULT true,
  active             boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_items_category ON game_items (category, subcategory);
CREATE INDEX idx_game_items_name_en ON game_items (lower(name_en));

-- Base (reference) attributes of an item. Never hard-code attribute columns.
CREATE TABLE item_base_attributes (
  item_id      uuid NOT NULL REFERENCES game_items(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES attributes(id),
  value_num    numeric,
  value_text   text,
  per_refine   boolean NOT NULL DEFAULT false,
  -- per_refine in PK: an item can have a base value AND a per-refine bonus of the same attribute
  PRIMARY KEY (item_id, attribute_id, per_refine),
  CHECK (value_num IS NOT NULL OR value_text IS NOT NULL)
);

CREATE INDEX idx_item_base_attr_attr ON item_base_attributes (attribute_id, value_num);

-- Import versioning / change detection
CREATE TABLE reference_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_tag text NOT NULL UNIQUE,          -- e.g. 2026-08-10
  source      text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  stats       jsonb NOT NULL DEFAULT '{}'::jsonb  -- {added, changed, removed, unknown}
);

CREATE TABLE reference_changes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id    uuid NOT NULL REFERENCES reference_versions(id) ON DELETE CASCADE,
  canonical_key text NOT NULL,
  change_type   text NOT NULL CHECK (change_type IN ('NEW','UPDATED','REMOVED','UNKNOWN')),
  old_hash      text,
  new_hash      text,
  payload       jsonb,                        -- old/new record snapshot for history
  review_status text NOT NULL DEFAULT 'PENDING'
                CHECK (review_status IN ('PENDING','APPROVED','REJECTED','AUTO')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reference_changes_review ON reference_changes (review_status, change_type);
