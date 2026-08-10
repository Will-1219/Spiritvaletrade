import Link from 'next/link';
import { getDb, formatGold, type Listing } from '@/lib/db';
import { getLang } from '@/lib/i18n';
import { getUser } from '@/lib/auth';
import LiveListings, { type ListingRow } from './LiveListings';

export const dynamic = 'force-dynamic';

export default async function Market() {
  const lang = await getLang();
  const zh = lang === 'zh';
  const db = getDb();
  const user = await getUser();

  if (!db) {
    return (
      <div className="panel p-6 max-w-xl mx-auto text-sm text-dim leading-relaxed">
        <b>市集尚未啟用</b> — 資料庫連線未設定(需要 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY)。
      </div>
    );
  }

  const { data, error } = await db
    .from('listings')
    .select('id,canonical_key,name_en,refine,quantity,price_gold,server,seller_name,note,image_url,expires_at')
    .eq('status', 'ACTIVE')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(200);

  const rows: ListingRow[] = ((data ?? []) as unknown as (Listing & { image_url: string | null })[]).map((l) => ({
    id: l.id, canonical_key: l.canonical_key, name_en: l.name_en,
    refine: l.refine, quantity: l.quantity, price_gold: l.price_gold,
    server: l.server, seller_name: l.seller_name, note: l.note,
    image_url: l.image_url, expires_at: l.expires_at,
    price_fmt: formatGold(l.price_gold),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">{zh ? '市集 — 玩家刊登' : 'Market — Player Listings'}</h1>
        <div className="flex gap-2">
          <Link href={user ? '/market/new' : '/login?next=/market/new'} className="btn">
            {zh ? '＋ 刊登物品' : '＋ Create Listing'}
          </Link>
          <Link href={user ? '/account' : '/login'} className="chip self-center hover:border-accent">
            {zh ? '我的刊登與出價' : 'My listings & offers'}
          </Link>
        </div>
      </div>

      {error && <div className="text-sm text-red-500">讀取失敗:{error.message}</div>}
      <LiveListings listings={rows} lang={lang} />

      <div className="text-xs text-dim">
        {zh
          ? '交易在 SpiritVale 遊戲內完成;ValeTrade 不經手款項。成交後才會互相顯示聯絡方式。'
          : 'Trades happen in-game; ValeTrade never handles payments. Contacts are revealed only after a deal.'}
      </div>
    </div>
  );
}
