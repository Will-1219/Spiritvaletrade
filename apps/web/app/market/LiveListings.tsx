'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCatalogIndex, matchItem } from '@/components/useCatalogIndex';

export interface ListingRow {
  id: string; canonical_key: string; name_en: string;
  refine: number; quantity: number; price_gold: number;
  server: string | null; seller_name: string; note: string | null;
  image_url: string | null; expires_at: string; price_fmt: string;
}

export default function LiveListings({ listings, lang }: { listings: ListingRow[]; lang: 'zh' | 'en' }) {
  const idx = useCatalogIndex();
  const [q, setQ] = useState('');
  const zh = lang === 'zh';

  const nameOf = useMemo(() => {
    const m = new Map<string, { zh: string | null; cn: string | null; en: string }>();
    for (const it of idx ?? []) m.set(it.k, { zh: it.zh, cn: it.cn, en: it.en });
    return m;
  }, [idx]);

  const filtered = useMemo(() => {
    const t = q.trim();
    if (!t) return listings;
    const lower = t.toLowerCase();
    return listings.filter((l) => {
      if (l.name_en.toLowerCase().includes(lower)) return true;
      const n = nameOf.get(l.canonical_key);
      return !!n && ((n.zh ?? '').includes(t) || (n.cn ?? '').includes(t));
    });
  }, [listings, q, nameOf]);

  // suggestions from full catalog (jump to filter even if no listing yet)
  const suggestions = useMemo(() => {
    const t = q.trim();
    if (!idx || !t) return [];
    return idx.filter((it) => matchItem(it, t)).slice(0, 6);
  }, [idx, q]);
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          className="input w-full"
          placeholder={zh ? '即時篩選:輸入幾個字(簡繁英皆可)…' : 'Live filter: type a few letters…'}
          autoComplete="off"
        />
        {focused && q.trim() && suggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full panel max-h-64 overflow-auto">
            {suggestions.map((s) => (
              <button key={s.k} type="button"
                className="flex w-full justify-between gap-3 px-3 py-2 text-sm hover:bg-accent/10 text-left"
                onMouseDown={() => setQ(lang === 'zh' ? (s.zh ?? s.en) : s.en)}>
                <span>{lang === 'zh' ? (s.zh ?? s.en) : s.en}</span>
                <span className="text-dim text-xs">{lang === 'zh' ? s.en : (s.zh ?? '')}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-dim">{filtered.length} / {listings.length} {zh ? '筆刊登' : 'listings'}</div>

      {filtered.length === 0 && (
        <div className="panel p-8 text-center text-dim text-sm">
          {zh ? '沒有符合的刊登。' : 'No matching listings.'}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((l) => {
          const n = nameOf.get(l.canonical_key);
          const display = lang === 'zh' ? (n?.zh ?? l.name_en) : l.name_en;
          return (
            <Link key={l.id} href={`/market/${l.id}`}
              className="panel p-3.5 flex items-center gap-4 hover:border-accent transition-colors">
              {l.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.image_url} alt="" className="h-12 w-12 object-cover rounded-md border border-line shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-md border border-line bg-bg shrink-0 grid place-items-center text-dim text-lg">⚔</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {l.refine > 0 && <span className="text-gold">+{l.refine} </span>}
                  {display}{l.quantity > 1 ? ` ×${l.quantity}` : ''}
                </div>
                <div className="text-xs text-dim truncate">
                  {l.name_en} · {l.seller_name}{l.server ? ` · ${l.server}` : ''}
                </div>
              </div>
              <div className="text-accent font-semibold whitespace-nowrap">{l.price_fmt} G</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
