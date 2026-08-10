'use server';

import { randomBytes } from 'node:crypto';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { getItem } from '@/lib/catalog';

export interface CreateResult {
  error?: string;
  token?: string;
  id?: string;
}

export async function createListing(_prev: CreateResult, form: FormData): Promise<CreateResult> {
  const db = getDb();
  if (!db) return { error: '市集資料庫尚未設定' };

  const key = String(form.get('canonical_key') ?? '').trim();
  const item = getItem(key);
  if (!item) return { error: '請從清單選擇有效的物品' };

  const price = Math.floor(Number(form.get('price_gold')));
  if (!Number.isFinite(price) || price <= 0) return { error: '價格必須是正整數(金幣)' };

  const refine = Math.min(20, Math.max(0, Math.floor(Number(form.get('refine') ?? 0)) || 0));
  const quantity = Math.min(9999, Math.max(1, Math.floor(Number(form.get('quantity') ?? 1)) || 1));
  const seller = String(form.get('seller_name') ?? '').trim().slice(0, 40);
  const contact = String(form.get('contact') ?? '').trim().slice(0, 120);
  const server = String(form.get('server') ?? '').trim().slice(0, 40) || null;
  const note = String(form.get('note') ?? '').trim().slice(0, 300) || null;
  const hours = [24, 48, 72].includes(Number(form.get('ttl'))) ? Number(form.get('ttl')) : 72;
  if (!seller) return { error: '請填角色名稱' };
  if (!contact) return { error: '請填聯絡方式(例如 Discord ID)' };

  const token = randomBytes(12).toString('hex');
  const { data, error } = await db
    .from('listings')
    .insert({
      canonical_key: item.canonical_key,
      name_en: item.name_en,
      refine, quantity, price_gold: price, server,
      seller_name: seller, contact, note,
      manage_token: token,
      expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
    })
    .select('id')
    .single();
  if (error) return { error: `建立失敗:${error.message}` };

  await db.from('listing_events').insert({ listing_id: data.id, event: 'created', payload: { price } });
  return { token, id: data.id };
}

export interface ManageResult {
  error?: string;
  ok?: string;
}

export async function manageListing(_prev: ManageResult, form: FormData): Promise<ManageResult> {
  const db = getDb();
  if (!db) return { error: '市集資料庫尚未設定' };
  const token = String(form.get('token') ?? '').trim();
  const action = String(form.get('action') ?? '');
  if (!token) return { error: '請輸入管理碼' };
  if (!['SOLD', 'CANCELLED'].includes(action)) return { error: '未知操作' };

  const { data: rows, error } = await db
    .from('listings')
    .update({ status: action, updated_at: new Date().toISOString() })
    .eq('manage_token', token)
    .eq('status', 'ACTIVE')
    .select('id,name_en');
  if (error) return { error: error.message };
  if (!rows?.length) return { error: '找不到使用中的刊登(管理碼錯誤或已結束)' };

  await db.from('listing_events').insert({
    listing_id: rows[0].id,
    event: action === 'SOLD' ? 'sold' : 'cancelled',
  });
  return { ok: `${rows[0].name_en} 已標記為 ${action === 'SOLD' ? '已售出' : '已取消'}` };
}
