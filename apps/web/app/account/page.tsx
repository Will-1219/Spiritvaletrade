import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDb, formatGold, type Listing } from '@/lib/db';
import { getUser, getProfile, contactSummary, type Profile } from '@/lib/auth';
import { getItem } from '@/lib/catalog';
import { displayName, getLang } from '@/lib/i18n';
import { signOut } from '@/app/login/actions';
import { ProfileForm, OfferRespond, ListingButtons, WithdrawButton } from './forms';

export const dynamic = 'force-dynamic';

interface OfferRow {
  id: string; listing_id: string; buyer_id: string;
  price_gold: number | null; message: string | null; status: string; created_at: string;
}

const STATUS_ZH: Record<string, string> = {
  ACTIVE: '上架中', RESERVED: '已預訂(成交中)', SOLD: '已售出', CANCELLED: '已下架',
  EXPIRED: '已到期', PENDING: '等待回應', ACCEPTED: '已成交', DECLINED: '已婉拒', WITHDRAWN: '已撤回',
};

export default async function Account() {
  const user = await getUser();
  if (!user) redirect('/login?next=/account');
  const db = getDb();
  if (!db) return <div className="panel p-6 text-sm text-dim">資料庫尚未設定。</div>;
  const lang = await getLang();
  const profile = await getProfile(user.id);

  // my listings + offers on them
  const { data: myListingsRaw } = await db
    .from('listings')
    .select('id,canonical_key,name_en,refine,quantity,price_gold,status,image_url,created_at,expires_at')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  const myListings = (myListingsRaw ?? []) as unknown as (Listing & { image_url: string | null })[];

  const listingIds = myListings.map((l) => l.id);
  let offersOnMine: OfferRow[] = [];
  if (listingIds.length) {
    const { data } = await db
      .from('offers').select('*').in('listing_id', listingIds)
      .in('status', ['PENDING', 'ACCEPTED'])
      .order('created_at', { ascending: false });
    offersOnMine = (data ?? []) as OfferRow[];
  }

  // my offers as buyer
  const { data: myOffersRaw } = await db
    .from('offers').select('*').eq('buyer_id', user.id)
    .order('created_at', { ascending: false }).limit(50);
  const myOffers = (myOffersRaw ?? []) as OfferRow[];

  // fetch related listings for my offers
  const offerListingIds = [...new Set(myOffers.map((o) => o.listing_id))];
  const listingById = new Map<string, Listing & { seller_id?: string }>();
  if (offerListingIds.length) {
    const { data } = await db
      .from('listings')
      .select('id,canonical_key,name_en,refine,price_gold,status,seller_id,seller_name')
      .in('id', offerListingIds);
    for (const l of (data ?? []) as (Listing & { seller_id?: string })[]) listingById.set(l.id, l);
  }

  // profiles for counterparts (buyers of accepted offers on mine + sellers of my accepted offers)
  const counterpartIds = new Set<string>();
  for (const o of offersOnMine) counterpartIds.add(o.buyer_id);
  for (const o of myOffers) {
    if (o.status === 'ACCEPTED') {
      const l = listingById.get(o.listing_id);
      if (l?.seller_id) counterpartIds.add(l.seller_id);
    }
  }
  const profileById = new Map<string, Profile>();
  if (counterpartIds.size) {
    const { data } = await db.from('profiles').select('*').in('id', [...counterpartIds]);
    for (const p of (data ?? []) as Profile[]) profileById.set(p.id, p);
  }

  const itemName = (key: string, fallback: string) => {
    const it = getItem(key);
    return it ? displayName(it, lang) : fallback;
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">我的帳號</h1>
        <form action={signOut}>
          <button className="chip hover:border-red-400">登出({user.email})</button>
        </form>
      </div>

      <section className="panel p-5 space-y-3">
        <h2 className="font-semibold">聯絡方式(成交後顯示給對方)</h2>
        <ProfileForm profile={profile} />
      </section>

      <section className="panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">我的刊登({myListings.length})</h2>
          <Link href="/market/new" className="btn !py-1.5">＋ 新刊登</Link>
        </div>
        {myListings.length === 0 && <div className="text-sm text-dim">還沒有刊登。</div>}
        {myListings.map((l) => {
          const offers = offersOnMine.filter((o) => o.listing_id === l.id);
          return (
            <div key={l.id} className="border border-line rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {l.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.image_url} alt="" className="h-10 w-10 object-cover rounded border border-line" />
                )}
                <b>{l.refine > 0 ? `+${l.refine} ` : ''}{itemName(l.canonical_key, l.name_en)}</b>
                <span className="text-accent">{formatGold(l.price_gold)} G</span>
                <span className="chip">{STATUS_ZH[l.status] ?? l.status}</span>
                <div className="ml-auto"><ListingButtons listingId={l.id} status={l.status} /></div>
              </div>
              {offers.map((o) => {
                const buyer = profileById.get(o.buyer_id) ?? null;
                return (
                  <div key={o.id} className="bg-bg rounded-lg p-2.5 text-sm flex flex-wrap items-center gap-3">
                    <span className="text-dim">出價:</span>
                    <b className="text-gold">{o.price_gold ? `${formatGold(o.price_gold)} G` : '照售價購買'}</b>
                    {o.message && <span className="text-dim">「{o.message}」</span>}
                    <span className="chip">{STATUS_ZH[o.status] ?? o.status}</span>
                    {o.status === 'PENDING' && <OfferRespond offerId={o.id} />}
                    {o.status === 'ACCEPTED' && (
                      <span className="text-accent text-xs">
                        買家聯絡方式:{contactSummary(buyer) || '(買家尚未填聯絡方式)'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>

      <section className="panel p-5 space-y-3">
        <h2 className="font-semibold">我的出價({myOffers.length})</h2>
        {myOffers.length === 0 && <div className="text-sm text-dim">還沒有出價。逛逛市集吧!</div>}
        {myOffers.map((o) => {
          const l = listingById.get(o.listing_id);
          const seller = l?.seller_id ? profileById.get(l.seller_id) ?? null : null;
          return (
            <div key={o.id} className="border border-line rounded-lg p-3 text-sm flex flex-wrap items-center gap-3">
              <b>{l ? `${l.refine > 0 ? `+${l.refine} ` : ''}${itemName(l.canonical_key, l.name_en)}` : '(刊登已刪除)'}</b>
              <span className="text-dim">售價 {l ? formatGold(l.price_gold) : '-'} G</span>
              <span className="text-gold">{o.price_gold ? `我出 ${formatGold(o.price_gold)} G` : '照售價'}</span>
              <span className="chip">{STATUS_ZH[o.status] ?? o.status}</span>
              {o.status === 'PENDING' && <WithdrawButton offerId={o.id} />}
              {o.status === 'ACCEPTED' && (
                <span className="text-accent text-xs w-full">
                  ✅ 成交!賣家 {l?.seller_name} 的聯絡方式:{contactSummary(seller) || '(賣家尚未填聯絡方式)'} — 請在遊戲內完成交易
                </span>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
