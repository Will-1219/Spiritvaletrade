import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb, formatGold, type Listing } from '@/lib/db';
import { getItem, formatAttr } from '@/lib/catalog';
import { displayName, getLang } from '@/lib/i18n';
import { getUser } from '@/lib/auth';
import OfferForm from './OfferForm';

export const dynamic = 'force-dynamic';

export default async function ListingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  if (!db) notFound();
  const lang = await getLang();
  const zh = lang === 'zh';
  const user = await getUser();

  const { data } = await db
    .from('listings')
    .select('id,canonical_key,name_en,refine,quantity,price_gold,server,seller_name,note,status,image_url,seller_id,created_at,expires_at')
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();
  const l = data as unknown as Listing & { image_url: string | null; seller_id: string | null };
  const item = getItem(l.canonical_key);
  const name = item ? displayName(item, lang) : l.name_en;
  const active = l.status === 'ACTIVE' && new Date(l.expires_at) > new Date();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link href="/market" className="text-sm text-dim hover:text-ink">← {zh ? '回市集' : 'Back to market'}</Link>

      <div className="panel p-6 space-y-4">
        <div className="flex gap-4 flex-wrap">
          {l.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.image_url} alt={l.name_en}
              className="w-40 max-h-56 object-contain rounded-lg border border-line bg-bg" />
          )}
          <div className="flex-1 min-w-52 space-y-2">
            <h1 className="text-2xl font-bold">
              {l.refine > 0 && <span className="text-gold">+{l.refine} </span>}
              {name}
              {l.quantity > 1 && <span className="text-dim text-lg"> ×{l.quantity}</span>}
            </h1>
            <div className="text-dim text-sm">{l.name_en}{l.server ? ` · ${l.server}` : ''}</div>
            <div className="text-2xl text-accent font-bold">{formatGold(l.price_gold)} G</div>
            <div className="text-xs text-dim">
              {zh ? '賣家' : 'Seller'}: {l.seller_name} · {zh ? '到期' : 'Expires'}:{' '}
              {new Date(l.expires_at).toLocaleString('zh-TW', { hour12: false })}
            </div>
            {!active && <span className="chip">{zh ? '此刊登已結束' : 'Listing ended'}</span>}
          </div>
        </div>
        {l.note && <div className="text-sm text-dim border-t border-line pt-3 whitespace-pre-wrap">{l.note}</div>}
        {item && (
          <div className="border-t border-line pt-3">
            <div className="text-xs text-dim mb-1">{zh ? '物品基礎資料' : 'Base item data'}
              {' · '}<Link className="underline" href={`/database/${encodeURIComponent(item.canonical_key)}`}>{zh ? '查看圖鑑' : 'view in database'}</Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-0.5 text-xs">
              {item.attributes.slice(0, 8).map((a, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-dim">{a.attribute_key}</span>
                  <span className={a.per_refine ? 'text-gold' : 'text-accent'}>{formatAttr(a)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {active && l.seller_id !== user?.id && (
        <div className="panel p-5">
          <OfferForm listingId={l.id} loggedIn={!!user} lang={lang} />
        </div>
      )}
      {l.seller_id === user?.id && (
        <div className="panel p-4 text-sm text-dim">
          {zh ? '這是你的刊登 — 到' : 'This is your listing — manage it in '}
          <Link href="/account" className="underline">{zh ? '我的帳號' : 'My account'}</Link>
          {zh ? ' 管理出價。' : '.'}
        </div>
      )}
    </div>
  );
}
