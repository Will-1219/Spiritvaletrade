'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCatalogIndex, matchItem, itemLabel, type IndexItem } from './useCatalogIndex';

const CATS = [
  { key: '', zh: '全部分類', en: 'All categories' },
  { key: 'equipment', zh: '裝備', en: 'Equipment' },
  { key: 'card', zh: '卡片', en: 'Cards' },
  { key: 'gem', zh: '寶石', en: 'Gems' },
];

interface AttrFilter { key: string; min: string }

export default function LiveDatabase({ lang, initialQ }: { lang: 'zh' | 'en'; initialQ?: string }) {
  const items = useCatalogIndex();
  const [q, setQ] = useState(initialQ ?? '');
  const [cat, setCat] = useState('');
  const [slot, setSlot] = useState('');
  const [attrs, setAttrs] = useState<AttrFilter[]>([{ key: '', min: '' }, { key: '', min: '' }, { key: '', min: '' }]);
  const zh = lang === 'zh';

  const slots = useMemo(() => {
    if (!items) return [];
    return [...new Set(items.map((i) => i.s).filter(Boolean))].sort() as string[];
  }, [items]);

  const attrOptions = useMemo(() => {
    if (!items) return [];
    const counts = new Map<string, number>();
    for (const it of items) for (const [k] of it.a) counts.set(k, (counts.get(k) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const results = useMemo(() => {
    if (!items) return [];
    return items.filter((it) => {
      if (cat && it.c !== cat) return false;
      if (slot && it.s !== slot) return false;
      if (!matchItem(it, q.trim())) return false;
      for (const f of attrs) {
        if (!f.key) continue;
        const rows = it.a.filter(([k]) => k === f.key);
        if (!rows.length) return false;
        const min = parseFloat(f.min);
        if (Number.isFinite(min)) {
          const base = rows.filter(([, , ref]) => !ref).reduce((s, [, v]) => s + v, 0);
          if (base < min) return false;
        }
      }
      return true;
    });
  }, [items, q, cat, slot, attrs]);

  // live suggestions: top name matches while typing
  const suggestions = useMemo(() => {
    const t = q.trim();
    if (!items || !t) return [];
    return items.filter((it) => matchItem(it, t)).slice(0, 8);
  }, [items, q]);
  const [focused, setFocused] = useState(false);

  if (!items) {
    return <div className="text-dim text-sm py-10 text-center">{zh ? '載入物品索引…' : 'Loading index…'}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="panel p-4 grid gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-56">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              className="input w-full"
              placeholder={zh ? '輸入幾個字即可,如「大剑」「fire」「卡片」…' : 'Type a few letters, e.g. "fire"…'}
              autoComplete="off"
            />
            {focused && suggestions.length > 0 && q.trim() && (
              <div className="absolute z-20 mt-1 w-full panel border-accent/30 max-h-72 overflow-auto">
                {suggestions.map((s) => (
                  <Link
                    key={s.k}
                    href={`/database/${encodeURIComponent(s.k)}`}
                    className="flex justify-between gap-3 px-3 py-2 text-sm hover:bg-accent/10"
                  >
                    <span>{itemLabel(s, lang)}</span>
                    <span className="text-dim text-xs">{lang === 'zh' ? s.en : (s.zh ?? '')}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="input">
            {CATS.map((c) => <option key={c.key} value={c.key}>{zh ? c.zh : c.en}</option>)}
          </select>
          <select value={slot} onChange={(e) => setSlot(e.target.value)} className="input">
            <option value="">{zh ? '全部部位' : 'All slots'}</option>
            {slots.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          {attrs.map((f, i) => (
            <div key={i} className="flex gap-2">
              <select
                value={f.key}
                onChange={(e) => setAttrs(attrs.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                className="input flex-1"
              >
                <option value="">{zh ? `屬性條件 ${i + 1}` : `Attribute ${i + 1}`}</option>
                {attrOptions.map(([k, n]) => <option key={k} value={k}>{k} ({n})</option>)}
              </select>
              <input
                value={f.min}
                onChange={(e) => setAttrs(attrs.map((x, j) => (j === i ? { ...x, min: e.target.value } : x)))}
                className="input w-20" placeholder="≥值" inputMode="numeric"
              />
            </div>
          ))}
        </div>
        <div className="text-sm text-dim">{results.length} {zh ? '筆結果(即時)' : 'results (live)'}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {results.slice(0, 120).map((it) => (
          <Link key={it.k} href={`/database/${encodeURIComponent(it.k)}`}
            className="panel p-4 hover:border-accent transition-colors">
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-medium truncate">{itemLabel(it, lang)}</div>
              <span className="chip shrink-0">{it.c}</span>
            </div>
            <div className="text-xs text-dim truncate">{lang === 'zh' ? it.en : (it.zh ?? '')}</div>
            <div className="mt-2 space-y-0.5 text-xs">
              {it.a.slice(0, 4).map(([k, v, ref], i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-dim">{k}</span>
                  <span className={ref ? 'text-gold' : 'text-accent'}>
                    {v > 0 ? '+' : ''}{v}{ref ? ' ×精煉' : ''}
                  </span>
                </div>
              ))}
              {it.a.length > 4 && <div className="text-dim">…{zh ? `共 ${it.a.length} 條屬性` : `${it.a.length} attributes`}</div>}
            </div>
          </Link>
        ))}
      </div>
      {results.length > 120 && (
        <div className="text-center text-sm text-dim">
          {zh ? `僅顯示前 120 筆(共 ${results.length}),請再縮小條件。` : `Showing 120 of ${results.length}.`}
        </div>
      )}
    </div>
  );
}
