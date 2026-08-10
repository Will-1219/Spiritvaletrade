import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client (service role). All listing reads/writes go
 * through server components / server actions — the browser never talks to
 * Supabase directly and manage_token never leaves the server except once,
 * right after creation, to the seller.
 *
 * Returns null when env vars are missing → market features show a setup note.
 */
let client: SupabaseClient | null | undefined;

export function getDb(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

export interface Listing {
  id: string;
  canonical_key: string;
  name_en: string;
  refine: number;
  quantity: number;
  price_gold: number;
  server: string | null;
  seller_name: string;
  contact: string;
  note: string | null;
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED';
  created_at: string;
  expires_at: string;
}

/** Columns safe to render publicly (never manage_token). */
export const PUBLIC_COLS =
  'id,canonical_key,name_en,refine,quantity,price_gold,server,seller_name,contact,note,status,created_at,expires_at';

export function formatGold(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(n % 100_000_000 ? 2 : 0)}億`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(n % 10_000 ? 1 : 0)}萬`;
  return n.toLocaleString();
}
