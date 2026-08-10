'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { createListing, type CreateResult } from '../actions';

interface ItemOpt { key: string; en: string; zh?: string }

export default function NewListingForm({ items, prefKey, lang }: {
  items: ItemOpt[]; prefKey?: string; lang: 'zh' | 'en';
}) {
  const [state, action, pending] = useActionState<CreateResult, FormData>(createListing, {});
  const zh = lang === 'zh';

  if (state.id) {
    return (
      <div className="panel p-6 space-y-4 max-w-xl mx-auto">
        <h2 className="text-lg font-bold text-accent">{zh ? '刊登成功!' : 'Listing created!'}</h2>
        <p className="text-sm text-dim">
          {zh
            ? '買家的購買意願與出價會出現在「我的帳號」,記得回來查看。'
            : 'Buy requests and offers will appear in My Account.'}
        </p>
        <div className="flex gap-3">
          <Link href={`/market/${state.id}`} className="btn">{zh ? '查看刊登' : 'View listing'}</Link>
          <Link href="/account" className="btn">{zh ? '我的帳號' : 'My account'}</Link>
        </div>
      </div>
    );
  }

  const pref = items.find((i) => i.key === prefKey);

  return (
    <form action={action} className="panel p-6 space-y-4 max-w-xl mx-auto">
      <h1 className="text-lg font-bold">{zh ? '刊登物品' : 'Create Listing'}</h1>

      <label className="block text-sm">
        <span className="text-dim">{zh ? '物品(輸入英文名,從清單選取)' : 'Item (type English name, pick from list)'}</span>
        <input name="item_search" list="vt-items" className="input w-full mt-1"
          defaultValue={pref ? pref.en : ''} required
          onChange={(e) => {
            const hit = items.find((i) => i.en === e.target.value);
            const hidden = document.getElementById('vt-key') as HTMLInputElement;
            if (hidden) hidden.value = hit?.key ?? '';
          }} />
        <datalist id="vt-items">
          {items.map((i) => (
            <option key={i.key} value={i.en}>{i.zh ?? ''}</option>
          ))}
        </datalist>
        <input type="hidden" id="vt-key" name="canonical_key" defaultValue={pref?.key ?? ''} />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="block text-sm">
          <span className="text-dim">{zh ? '精煉 +' : 'Refine +'}</span>
          <input name="refine" type="number" min={0} max={20} defaultValue={0} className="input w-full mt-1" />
        </label>
        <label className="block text-sm">
          <span className="text-dim">{zh ? '數量' : 'Qty'}</span>
          <input name="quantity" type="number" min={1} max={9999} defaultValue={1} className="input w-full mt-1" />
        </label>
        <label className="block text-sm">
          <span className="text-dim">{zh ? '刊登時效' : 'Expires in'}</span>
          <select name="ttl" defaultValue="72" className="input w-full mt-1">
            <option value="24">24h</option><option value="48">48h</option><option value="72">72h</option>
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-dim">{zh ? '售價(金幣,整數;例 15000000 = 1500萬)' : 'Price (gold, integer)'}</span>
        <input name="price_gold" type="number" min={1} className="input w-full mt-1" required placeholder="15000000" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-dim">{zh ? '角色名稱' : 'Character name'}</span>
          <input name="seller_name" className="input w-full mt-1" required maxLength={40} />
        </label>
        <label className="block text-sm">
          <span className="text-dim">{zh ? '伺服器(選填)' : 'Server (optional)'}</span>
          <input name="server" className="input w-full mt-1" maxLength={40} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-dim">{zh ? '物品截圖(選填,遊戲 tooltip 截圖讓買家更信任)' : 'Item screenshot (optional)'}</span>
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className="input w-full mt-1 file:mr-3 file:rounded-md file:border-0 file:bg-accent/10 file:text-accent file:px-3 file:py-1" />
      </label>

      <label className="block text-sm">
        <span className="text-dim">{zh ? '備註(選填,如隨機屬性)' : 'Note (optional, e.g. random substats)'}</span>
        <textarea name="note" className="input w-full mt-1" rows={2} maxLength={300} />
      </label>

      {state.error && <div className="text-sm text-red-600">{state.error}</div>}

      <button className="btn w-full" disabled={pending} type="submit">
        {pending ? (zh ? '刊登中…' : 'Publishing…') : (zh ? '發布刊登' : 'Publish listing')}
      </button>
      <p className="text-xs text-dim">
        {zh
          ? '刊登免費。交易在遊戲內完成,本站不經手款項。到期未續約自動下架。'
          : 'Free to list. Trades complete in-game; listings auto-expire.'}
      </p>
    </form>
  );
}
