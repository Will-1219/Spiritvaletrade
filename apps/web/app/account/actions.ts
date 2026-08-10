'use server';

import { getDb } from '@/lib/db';
import { getUser } from '@/lib/auth';

export interface ActionResult {
  error?: string;
  ok?: string;
}

export async function updateProfile(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const db = getDb();
  const user = await getUser();
  if (!db || !user) return { error: '請先登入' };
  const f = (k: string, max = 60) => String(form.get(k) ?? '').trim().slice(0, max) || null;
  const { error } = await db.from('profiles').upsert({
    id: user.id,
    display_name: f('display_name', 40),
    game_character: f('game_character', 40),
    contact_discord: f('contact_discord'),
    contact_line: f('contact_line'),
    contact_wechat: f('contact_wechat'),
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  return { ok: '已儲存' };
}

/** 賣家回應出價:接受(→ 刊登 RESERVED,雙方互見聯絡方式)或婉拒 */
export async function respondOffer(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const db = getDb();
  const user = await getUser();
  if (!db || !user) return { error: '請先登入' };
  const offerId = String(form.get('offer_id') ?? '');
  const action = String(form.get('action') ?? '');
  if (!['ACCEPTED', 'DECLINED'].includes(action)) return { error: '未知操作' };

  const { data: offer } = await db
    .from('offers')
    .select('id,listing_id,status,listings!inner(id,seller_id,status)')
    .eq('id', offerId)
    .maybeSingle();
  const listing = (offer as { listings?: { seller_id: string; status: string } } | null)?.listings;
  if (!offer || !listing) return { error: '找不到出價' };
  if (listing.seller_id !== user.id) return { error: '只有賣家可以回應' };
  if (offer.status !== 'PENDING') return { error: '此出價已處理過' };

  const { error } = await db
    .from('offers')
    .update({ status: action, updated_at: new Date().toISOString() })
    .eq('id', offerId);
  if (error) return { error: error.message };

  if (action === 'ACCEPTED') {
    await db.from('listings')
      .update({ status: 'RESERVED', updated_at: new Date().toISOString() })
      .eq('id', offer.listing_id);
    await db.from('listing_events').insert({ listing_id: offer.listing_id, event: 'offer_accepted' });
    return { ok: '已接受!雙方現在可在帳號頁看到彼此的聯絡方式,請在遊戲內完成交易。' };
  }
  return { ok: '已婉拒此出價' };
}

/** 賣家完成/取消刊登 */
export async function updateMyListing(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const db = getDb();
  const user = await getUser();
  if (!db || !user) return { error: '請先登入' };
  const id = String(form.get('listing_id') ?? '');
  const action = String(form.get('action') ?? '');
  const map: Record<string, string> = { sold: 'SOLD', cancel: 'CANCELLED', relist: 'ACTIVE' };
  const status = map[action];
  if (!status) return { error: '未知操作' };

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === 'ACTIVE') patch.expires_at = new Date(Date.now() + 72 * 3600_000).toISOString();

  const { data: rows, error } = await db
    .from('listings').update(patch)
    .eq('id', id).eq('seller_id', user.id)
    .select('id');
  if (error) return { error: error.message };
  if (!rows?.length) return { error: '找不到你的刊登' };
  await db.from('listing_events').insert({ listing_id: id, event: action });
  return { ok: '已更新' };
}

/** 買家撤回出價 */
export async function withdrawOffer(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const db = getDb();
  const user = await getUser();
  if (!db || !user) return { error: '請先登入' };
  const id = String(form.get('offer_id') ?? '');
  const { error } = await db
    .from('offers')
    .update({ status: 'WITHDRAWN', updated_at: new Date().toISOString() })
    .eq('id', id).eq('buyer_id', user.id).eq('status', 'PENDING');
  if (error) return { error: error.message };
  return { ok: '已撤回' };
}
