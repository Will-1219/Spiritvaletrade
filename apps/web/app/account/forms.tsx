'use client';

import { useActionState } from 'react';
import { updateProfile, respondOffer, updateMyListing, withdrawOffer, type ActionResult } from './actions';
import type { Profile } from '@/lib/auth';

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateProfile, {});
  return (
    <form action={action} className="grid sm:grid-cols-2 gap-3 text-sm">
      <label>
        <span className="text-dim">暱稱</span>
        <input name="display_name" defaultValue={profile?.display_name ?? ''} className="input w-full mt-1" />
      </label>
      <label>
        <span className="text-dim">遊戲角色名</span>
        <input name="game_character" defaultValue={profile?.game_character ?? ''} className="input w-full mt-1" />
      </label>
      <label>
        <span className="text-dim">Discord</span>
        <input name="contact_discord" defaultValue={profile?.contact_discord ?? ''} className="input w-full mt-1" />
      </label>
      <label>
        <span className="text-dim">LINE ID</span>
        <input name="contact_line" defaultValue={profile?.contact_line ?? ''} className="input w-full mt-1" />
      </label>
      <label>
        <span className="text-dim">微信 WeChat</span>
        <input name="contact_wechat" defaultValue={profile?.contact_wechat ?? ''} className="input w-full mt-1" />
      </label>
      <div className="flex items-end gap-3">
        <button className="btn" disabled={pending}>{pending ? '…' : '儲存聯絡方式'}</button>
        {state.ok && <span className="text-accent text-xs">{state.ok}</span>}
        {state.error && <span className="text-red-600 text-xs">{state.error}</span>}
      </div>
      <p className="sm:col-span-2 text-xs text-dim">聯絡方式只會在「成交後」顯示給對方,平常完全不公開。至少填一項。</p>
    </form>
  );
}

export function OfferRespond({ offerId }: { offerId: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(respondOffer, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="offer_id" value={offerId} />
      <button className="btn !py-1 !px-3 text-xs" name="action" value="ACCEPTED" disabled={pending}>接受</button>
      <button className="chip hover:border-red-500" name="action" value="DECLINED" disabled={pending}>婉拒</button>
      {state.ok && <span className="text-accent text-xs">{state.ok}</span>}
      {state.error && <span className="text-red-600 text-xs">{state.error}</span>}
    </form>
  );
}

export function ListingButtons({ listingId, status }: { listingId: string; status: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateMyListing, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="listing_id" value={listingId} />
      {(status === 'ACTIVE' || status === 'RESERVED') && (
        <button className="btn !py-1 !px-3 text-xs" name="action" value="sold" disabled={pending}>標記售出</button>
      )}
      {status === 'ACTIVE' && (
        <button className="chip hover:border-red-500" name="action" value="cancel" disabled={pending}>下架</button>
      )}
      {(status === 'EXPIRED' || status === 'CANCELLED') && (
        <button className="chip hover:border-accent" name="action" value="relist" disabled={pending}>重新上架 72h</button>
      )}
      {state.ok && <span className="text-accent text-xs">{state.ok}</span>}
      {state.error && <span className="text-red-600 text-xs">{state.error}</span>}
    </form>
  );
}

export function WithdrawButton({ offerId }: { offerId: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(withdrawOffer, {});
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="offer_id" value={offerId} />
      <button className="chip hover:border-red-500" disabled={pending}>撤回</button>
      {state.ok && <span className="text-accent text-xs">{state.ok}</span>}
    </form>
  );
}
