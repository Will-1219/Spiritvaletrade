'use client';

import { useState, useActionState } from 'react';
import Link from 'next/link';
import { makeOffer, type OfferResult } from '../actions';

export default function OfferForm({ listingId, loggedIn, lang }: {
  listingId: string; loggedIn: boolean; lang: 'zh' | 'en';
}) {
  const [mode, setMode] = useState<'buy' | 'bid'>('buy');
  const [state, action, pending] = useActionState<OfferResult, FormData>(makeOffer, {});
  const zh = lang === 'zh';

  if (!loggedIn) {
    return (
      <div className="text-sm text-dim">
        <Link href={`/login?next=/market/${listingId}`} className="btn inline-block">
          {zh ? '登入後即可購買 / 出價' : 'Sign in to buy / make an offer'}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="listing_id" value={listingId} />
      <input type="hidden" name="mode" value={mode} />
      <div className="flex gap-2">
        <button type="button"
          className={`flex-1 py-2 rounded-lg text-sm border ${mode === 'buy' ? 'border-accent text-accent bg-accent/10' : 'border-line text-dim'}`}
          onClick={() => setMode('buy')}>
          {zh ? '有意購買(照售價)' : 'Buy at asking price'}
        </button>
        <button type="button"
          className={`flex-1 py-2 rounded-lg text-sm border ${mode === 'bid' ? 'border-gold text-gold bg-gold/10' : 'border-line text-dim'}`}
          onClick={() => setMode('bid')}>
          {zh ? '出價' : 'Make offer'}
        </button>
      </div>
      {mode === 'bid' && (
        <input name="price_gold" type="number" min={1} required className="input w-full"
          placeholder={zh ? '你的出價(金幣)' : 'Your offer (gold)'} />
      )}
      <input name="message" className="input w-full" maxLength={200}
        placeholder={zh ? '留言給賣家(選填)' : 'Message to seller (optional)'} />
      {state.error && <div className="text-sm text-red-600">{state.error}</div>}
      {state.ok && <div className="text-sm text-accent">{state.ok} — {zh ? '結果請到' : 'track it in '}<Link className="underline" href="/account">{zh ? '我的帳號' : 'My account'}</Link></div>}
      {!state.ok && (
        <button className="btn w-full" disabled={pending}>
          {pending ? '…' : mode === 'buy' ? (zh ? '送出購買意願' : 'Send buy request') : (zh ? '送出出價' : 'Send offer')}
        </button>
      )}
    </form>
  );
}
