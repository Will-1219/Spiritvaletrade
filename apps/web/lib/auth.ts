import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { getDb } from './db';

/** Anon-key server client bound to request cookies — used ONLY for auth. */
export async function getAuthClient() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const store = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          /* RSC render — middleware handles refresh */
        }
      },
    },
  });
}

export async function getUser(): Promise<User | null> {
  const c = await getAuthClient();
  if (!c) return null;
  const { data } = await c.auth.getUser();
  return data.user ?? null;
}

export interface Profile {
  id: string;
  display_name: string | null;
  game_character: string | null;
  contact_discord: string | null;
  contact_line: string | null;
  contact_wechat: string | null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const db = getDb();
  if (!db) return null;
  const { data } = await db.from('profiles').select('*').eq('id', userId).maybeSingle();
  return (data as Profile | null) ?? null;
}

export function contactSummary(p: Profile | null): string {
  if (!p) return '';
  const parts = [
    p.game_character && `遊戲ID: ${p.game_character}`,
    p.contact_discord && `Discord: ${p.contact_discord}`,
    p.contact_line && `LINE: ${p.contact_line}`,
    p.contact_wechat && `微信: ${p.contact_wechat}`,
  ].filter(Boolean);
  return parts.join(' · ');
}
