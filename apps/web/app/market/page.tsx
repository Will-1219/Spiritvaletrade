import Link from 'next/link';
import { getDb, formatGold, PUBLIC_COLS, type Listing } from '@/lib/db';
import { getItem } from '@/lib/catalog';
import { displayName, getLang } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Market({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const lang = await getLang();
  const db = getDb();
  const { q } = await searchParams;

  if (!db) {
    return (
      <div className="panel p-6 max-w-xl mx-auto text-sm text-dim leading-relaxed">
        <b className="text-slate-200">市集尚未啟用</b> — 資料庫連線未設定
        （需要 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY 環境變數）。
      </div>
    );
  }

  let query = db
    .from('listings')
    .select(PUBLIC_COLS)
    .eq('status', 'ACTIVE')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(100);
  if (q?.trim()) query = query.ilike('name_en', `%${q.trim()}%`);
  const { data, error } = await query;
  const listings = (data ?? []) as unknown as Listing[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">{lang === 'zh' ? '市集 — 玩家刊登' : 'Market — Player Listings'}</h1>
        <Link href="/market/new" className="btn">{lang === 'zh' ? '＋ 刊登物品' : '＋ Create Listing'}</Link>
      </div>

      <form className="flex gap-2" method="get">
        <input name="q" defaultValue={q ?? ''} className="input flex-1 max-w-sm"
          placeholder={lang === 'zh' ? '用英文名稱搜尋刊登…' : 'Search listings by English name…'} />
        <button className="btn" type="submit">{lang === 'zh' ? '搜尋' : 'Search'}</button>
        <Link href="/market/manage" className="chip self-center hover:border-accent">
          {lang === 'zh' ? '管理我的刊登' : 'Manage my listing'}
        </Link>
      </form>

      {error && <div className="text-sm text-red-400">讀取失敗:{error.message}</div>}
      {!error && listings.length === 0 && (
        <div className="panel p-8 text-center text-dim text-sm">
          {lang === 'zh' ? '目前沒有刊登 — 當第一個賣家!' : 'No listings yet — be the first seller!'}
        </div>
      )}

      <div className="space-y-2">
        {listings.map((l) => {
          const item = getItem(l.canonical_key);
          const name = item ? displayName(item, lang) : l.name_en;
          return (
            <div key={l.id} className="panel p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="min-w-48 flex-1">
                <Link href={`/database/${encodeURIComponent(l.canonical_key)}`} className="font-medium hover:text-accent">
                  {l.refine > 0 && <span className="text-gold">+{l.refine} </span>}
                  {name}
                </Link>
                <div className="text-xs text-dim">
                  {l.name_en}{l.quantity > 1 ? ` ×${l.quantity}` : ''}{l.server ? ` · ${l.server}` : ''}
                </div>
              </div>
              <div className="text-accent font-semibold whitespace-nowrap">{formatGold(l.price_gold)} G</div>
              <div className="text-xs text-dim whitespace-nowrap">
                {lang === 'zh' ? '賣家' : 'Seller'}: <span className="text-slate-200">{l.seller_name}</span>
                {' · '}{l.contact}
              </div>
              <div className="text-xs text-dim whitespace-nowrap">
                {lang === 'zh' ? '到期' : 'Expires'}: {new Date(l.expires_at).toLocaleString('zh-TW', { hour12: false })}
              </div>
              {l.note && <div className="w-full text-xs text-dim">{l.note}</div>}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-dim">
        {lang === 'zh'
          ? '交易在 SpiritVale 遊戲內完成;ValeTrade 不經手款項。聯絡賣家前請自行確認物品與價格。'
          : 'Trades happen in-game; ValeTrade never handles payments. Verify item and price with the seller.'}
      </div>
    </div>
  );
}
