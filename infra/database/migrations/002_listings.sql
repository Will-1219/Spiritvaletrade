-- ValeTrade marketplace listings (v1, Supabase)
-- Run in Supabase SQL Editor. All app access goes through the server
-- (service role); RLS is enabled with NO policies so anon/authenticated
-- clients cannot read manage_token or write directly.

CREATE TABLE IF NOT EXISTS listings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_key text NOT NULL,
  name_en       text NOT NULL,
  refine        int  NOT NULL DEFAULT 0 CHECK (refine BETWEEN 0 AND 20),
  quantity      int  NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 9999),
  price_gold    bigint NOT NULL CHECK (price_gold > 0),
  server        text,
  seller_name   text NOT NULL,          -- in-game character name
  contact       text NOT NULL,          -- discord id etc.
  note          text,
  status        text NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE','SOLD','CANCELLED','EXPIRED')),
  manage_token  text NOT NULL,          -- secret; only ever shown to the seller once
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT now() + interval '72 hours'
);

CREATE INDEX IF NOT EXISTS idx_listings_active
  ON listings (status, expires_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_item
  ON listings (canonical_key, status);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
-- no policies on purpose: service-role only.

CREATE TABLE IF NOT EXISTS listing_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  event      text NOT NULL,             -- created | sold | cancelled | expired | price_changed
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE listing_events ENABLE ROW LEVEL SECURITY;
