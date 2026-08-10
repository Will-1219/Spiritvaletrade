'use server';

import { randomBytes } from 'node:crypto';
import { getDb } from '@/lib/db';
import { getItem } from '@/lib/catalog';
import { getUser } from '@/lib/auth';

export interface CreateResult {
  error?: string;
  token?: string;
  id?: string;
}

export async function createListing(_prev: CreateResult, form: FormData): Promise<CreateResult> {
  const db = getDb();
  if (!db) return { error: '市集資料庫尚未設定' };
  const user = await getUser();
  if (!user) return { error: '請先登入再刊登' };

  const key = String(form.get('canonical_key') ?? '').trim();
  const item = getItem(key);
  if (!item) return { error: '請從清單選擇有效的物品' };

  const price = Math.floor(Number(form.get('price_gold')));
  if (!Number.isFinite(price) || price <= 0) return { error: '價格必須是正整數(金幣)' };

  const refine = Math.min(20, Math.max(0, Math.floor(Number(form.get('refine') ?? 0)) || 0));
  const quantity = Math.min(9999, Math.max(1, Math.floor(Number(form.get('quantity') ?? 1)) || 1));
  const seller = String(form.get('seller_name') ?? '').trim().slice(0, 40);
  const server = String(form.get('server') ?? '').trim().slice(0, 40) || null;
  const note = String(form.get('note') ?? '').trim().slice(0, 300) || null;
  const hours = [24, 48, 72].includes(Number(form.get('ttl'))) ? Number(form.get('ttl')) : 72;
  if (!seller) return { error: '請填角色名稱' };

  // optional tooltip/item image (圖文並茂)
  let imageUrl: string | null = null;
  const img = form.get('image');
  if (img instanceof File && img.size > 0) {
    if (img.size > 2 * 1024 * 1024) return { error: '圖片請小於 2MB' };
    if (!/^image\/(png|jpe?g|webp)$/.test(img.type)) return { error: '圖片格式限 PNG/JPG/WebP' };
    const ext = img.type === 'image/png' ? 'png' : img.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${user.id}/${Date.now()}_${randomBytes(4).toString('hex')}.${ext}`;
    const { error: upErr } = await db.storage
      .from('listing-images')
      .upload(path, Buffer.from(await img.arrayBuffer()), { contentType: img.type });
    if (!upErr) {
      imageUrl = db.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
    }
  }

  const token = randomBytes(12).toString('hex');
  const { data, error } = await db
    .from('listings')
    .insert({
      canonical_key: item.canonical_key,
      name_en: item.name_en,
      refine, quantity, price_gold: price, server,
      seller_name: seller,
      contact: '(帳號成交後顯示)',
      note,
      seller_id: user.id,
      image_url: imageUrl,
      manage_token: token,
      expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
    })
    .select('id')
    .single();
  if (error) return { error: `建立失敗:${error.message}` };

  await db.from('listing_events').insert({ listing_id: data.id, event: 'created', payload: { price } });
  return { id: data.id };
}

export interface OfferResult {
  error?: string;
  ok?: string;
}

/** 有意購買(price=null 表示照售價) / 出價 */
export async function makeOffer(_prev: OfferResult, form: FormData): Promise<OfferResult> {
  const db = getDb();
  if (!db) return { error: '市集資料庫尚未設定' };
  const user = await getUser();
  if (!user) return { error: '請先登入' };

  const listingId = String(form.get('listing_id') ?? '');
  const mode = String(form.get('mode') ?? 'buy');
  const rawPrice = form.get('price_gold');
  let price: number | null = null;
  if (mode === 'bid') {
    price = Math.floor(Number(rawPrice));
    if (!Number.isFinite(price) || price <= 0) return { error: '出價必須是正整數' };
  }
  const message = String(form.get('message') ?? '').trim().slice(0, 200) || null;

  const { data: listing } = await db
    .from('listings').select('id,seller_id,status,expires_at').eq('id', listingId).maybeSingle();
  if (!listing || listing.status !== 'ACTIVE' || new Date(listing.expires_at) < new Date()) {
    return { error: '此刊登已不存在或已結束' };
  }
  if (listing.seller_id === user.id) return { error: '不能對自己的刊登出價' };

  const { error } = await db.from('offers').upsert(
    {
      listing_id: listingId, buyer_id: user.id,
      price_gold: price, message, status: 'PENDING',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'listing_id,buyer_id' },
  );
  if (error) return { error: error.message };
  return { ok: mode === 'bid' ? '出價已送出,等賣家回應' : '已通知賣家你有意購買' };
}

/** legacy:匿名管理碼(帳號功能上線前的刊登仍可用) */
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
  return { ok: `${rows[0].name_en} 已更新` };
}
