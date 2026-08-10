-- ValeTrade v2: player accounts, offers (有意購買/出價), listing images
-- Run in Supabase SQL Editor AFTER 002_listings.sql.

-- ── profiles (one per auth user) ────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text,
  game_character  text,       -- 遊戲角色名
  contact_discord text,
  contact_line    text,
  contact_wechat  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- service-role only (no policies)

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, split_part(new.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── listings: link to seller account + image ────────────────────
ALTER TABLE listings ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES auth.users(id);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS image_url text;
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings (seller_id, status);

-- ── offers(有意購買 / 出價) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id    uuid NOT NULL REFERENCES auth.users(id),
  price_gold  bigint,                    -- NULL = 照售價「有意購買」
  message     text,
  status      text NOT NULL DEFAULT 'PENDING'
              CHECK (status IN ('PENDING','ACCEPTED','DECLINED','WITHDRAWN')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, buyer_id)          -- 一個買家對同一刊登一個進行中的出價
);
CREATE INDEX IF NOT EXISTS idx_offers_listing ON offers (listing_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON offers (buyer_id, status);
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- ── listing images bucket (public read) ─────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "public read listing images" ON storage.objects;
CREATE POLICY "public read listing images" ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-images');
