import Link from 'next/link';
import {
  attributeOptions, CATEGORIES, formatAttr, searchItems, slotOptions, type AttrFilter,
} from '@/lib/catalog';

export const dynamic = 'force-dynamic';

interface Params {
  q?: string; cat?: string; slot?: string;
  a1?: string; v1?: string; a2?: string; v2?: string; a3?: string; v3?: string;
}

export default async function Database({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const attrs: AttrFilter[] = [];
  for (const [a, v] of [[p.a1, p.v1], [p.a2, p.v2], [p.a3, p.v3]] as const) {
    if (a) attrs.push({ key: a, min: v ? parseFloat(v) || 0 : 0 });
  }
  const results = searchItems({ q: p.q, cat: p.cat, slot: p.slot, attrs });
  const attrOpts = attributeOptions();
  const slots = slotOptions();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">物品資料庫</h1>

      <form className="panel p-4 grid gap-3" method="get">
        <div className="flex flex-wrap gap-2">
          <input name="q" defaultValue={p.q ?? ''} className="input flex-1 min-w-48" placeholder="名稱（中英文）…" />
          <select name="cat" defaultValue={p.cat ?? ''} className="input">
            <option value="">全部分類</option>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.zh}</option>)}
          </select>
          <select name="slot" defaultValue={p.slot ?? ''} className="input">
            <option value="">全部部位</option>
            {slots.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((i) => {
            const aName = `a${i}` as keyof Params;
            const vName = `v${i}` as keyof Params;
            return (
              <div key={i} className="flex gap-2">
                <select name={aName} defaultValue={(p[aName] as string) ?? ''} className="input flex-1">
                  <option value="">屬性條件 {i}</option>
                  {attrOpts.map((o) => (
                    <option key={o.key} value={o.key}>{o.key} ({o.count})</option>
                  ))}
                </select>
                <input
                  name={vName} defaultValue={(p[vName] as string) ?? ''} className="input w-20"
                  placeholder="≥值" inputMode="numeric"
                />
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <button className="btn" type="submit">套用篩選</button>
          <Link href="/database" className="text-sm text-dim hover:text-slate-200">清除</Link>
          <span className="text-sm text-dim ml-auto">{results.length} 筆結果</span>
        </div>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {results.slice(0, 120).map((it) => (
          <Link
            key={it.canonical_key}
            href={`/database/${encodeURIComponent(it.canonical_key)}`}
            className="panel p-4 hover:border-accent transition-colors"
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-medium truncate">{it.name_zh_tw ?? it.name_en}</div>
              <span className="chip shrink-0">{it.category}</span>
            </div>
            <div className="text-xs text-dim truncate">{it.name_en}</div>
            <div className="mt-2 space-y-0.5 text-xs">
              {it.attributes.slice(0, 4).map((a, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-dim">{a.attribute_key}</span>
                  <span className={a.per_refine ? 'text-gold' : 'text-accent'}>{formatAttr(a)}</span>
                </div>
              ))}
              {it.attributes.length > 4 && (
                <div className="text-dim">…共 {it.attributes.length} 條屬性</div>
              )}
            </div>
          </Link>
        ))}
      </div>
      {results.length > 120 && (
        <div className="text-center text-sm text-dim">僅顯示前 120 筆，請加上更多篩選條件。</div>
      )}
    </div>
  );
}
