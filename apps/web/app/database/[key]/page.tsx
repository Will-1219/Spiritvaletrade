import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatAttr, getItem } from '@/lib/catalog';
import { displayName, subName, getLang, T } from '@/lib/i18n';
import { getDb, formatGold, PUBLIC_COLS, type Listing } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ItemDetail({ params }: { params: Promise<{ key: string }> }) {
  const lang = await getLang();
  const t = T[lang];
  const { key } = await params;
  const item = getItem(decodeURIComponent(key));
  if (!item) notFound();

  const base = item.attributes.filter((a) => !a.per_refine);
  const refine = item.attributes.filter((a) => a.per_refine);

  // active listings for this item
  const db = getDb();
  let listings: Listing[] = [];
  if (db) {
    const { data } = await db
      .from('listings')
      .select(PUBLIC_COLS)
      .eq('canonical_key', item.canonical_key)
      .eq('status', 'ACTIVE')
      .gt('expires_at', new Date().toISOString())
      .order('price_gold', { ascending: true })
      .limit(20);
    listings = (data ?? []) as unknown as Listing[];
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/database" className="text-sm text-dim hover:text-slate-200">{t.backToDb}</Link>

      <div className="panel p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{displayName(item, lang)}</h1>
            <div className="text-dim">{subName(item, lang)}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="chip">{item.category}</span>
              {item.subcategory && <span className="chip">{item.subcategory}</span>}
              {item.equipment_slot && <span className="chip">{item.equipment_slot}</span>}
            </div>
          </div>
          <Link href={`/market/new?item=${encodeURIComponent(item.canonical_key)}`} className="btn shrink-0">
            {lang === 'zh' ? '刊登此物品' : 'Sell this item'}
          </Link>
        </div>

        {base.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-dim mb-2">{t.baseAttrs}</h2>
            <div className="space-y-1 text-sm">
              {base.map((a, i) => (
                <div key={i} className="flex justify-between border-b border-line/60 pb-1">
                  <span>{a.attribute_key}</span>
                  <span className="text-accent">{formatAttr(a)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {refine.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-dim mb-2">{t.refineGrowth}</h2>
            <div className="space-y-1 text-sm">
              {refine.map((a, i) => (
                <div key={i} className="flex justify-between border-b border-line/60 pb-1">
                  <span>{a.attribute_key}</span>
                  <span className="text-gold">{formatAttr(a)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {item.description && (
          <div className="text-sm text-dim whitespace-pre-wrap">{item.description}</div>
        )}
      </div>

      <div className="panel p-4 space-y-3">
        <h2 className="text-sm font-semibold">
          {lang === 'zh' ? '目前在售' : 'Active listings'}
          {listings.length > 0 && <span className="text-dim">（{listings.length}）</span>}
        </h2>
        {listings.length === 0 && (
          <div className="text-sm text-dim">
            {lang === 'zh' ? '目前沒有這個物品的刊登。' : 'No active listings for this item.'}
          </div>
        )}
        {listings.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm border-b border-line/60 pb-2">
            <span>
              {l.refine > 0 && <span className="text-gold">+{l.refine} </span>}
              {l.quantity > 1 ? `×${l.quantity}` : ''}
            </span>
            <span className="text-accent font-semibold">{formatGold(l.price_gold)} G</span>
            <span className="text-dim text-xs">
              {l.seller_name} · {l.contact}{l.server ? ` · ${l.server}` : ''}
            </span>
            {l.note && <span className="w-full text-xs text-dim">{l.note}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
