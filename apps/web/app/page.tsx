import Link from 'next/link';
import { CATEGORIES, getCatalog } from '@/lib/catalog';

export default function Home() {
  const catalog = getCatalog();
  const counts = new Map<string, number>();
  for (const it of catalog.items) counts.set(it.category, (counts.get(it.category) ?? 0) + 1);
  const highlights = catalog.items.filter((i) => i.attributes.length >= 4).slice(0, 6);

  return (
    <div className="space-y-10">
      <section className="text-center pt-8 space-y-4">
        <h1 className="text-3xl font-bold">
          搜尋 <span className="text-accent">SpiritVale</span> 物品 — 用任何屬性
        </h1>
        <p className="text-dim text-sm">
          精煉、插槽、卡片、寶石、任意數值條件。不只是名稱搜尋。
        </p>
        <form action="/database" className="flex justify-center gap-2 pt-2">
          <input
            name="q"
            className="input w-80"
            placeholder="搜尋物品名稱（中英文皆可）…"
            autoComplete="off"
          />
          <button className="btn" type="submit">搜尋</button>
        </form>
        <div className="text-xs text-dim">
          目前收錄 {catalog.items.length} 筆物品資料 · game v0.30.10
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CATEGORIES.map((c) => (
          <Link key={c.key} href={`/database?cat=${c.key}`} className="panel p-5 hover:border-accent transition-colors">
            <div className="text-lg font-semibold">{c.zh}</div>
            <div className="text-dim text-sm mt-1">{counts.get(c.key) ?? 0} 筆</div>
          </Link>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">屬性豐富的物品</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {highlights.map((it) => (
            <Link
              key={it.canonical_key}
              href={`/database/${encodeURIComponent(it.canonical_key)}`}
              className="panel p-4 hover:border-accent transition-colors"
            >
              <div className="font-medium">{it.name_zh_tw ?? it.name_en}</div>
              <div className="text-xs text-dim">{it.name_en}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="chip">{it.category}</span>
                {it.equipment_slot && <span className="chip">{it.equipment_slot}</span>}
                <span className="chip">{it.attributes.length} 屬性</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel p-5 text-sm text-dim leading-relaxed">
        <b className="text-slate-200">市集刊登即將推出</b> — 玩家將可把遊戲內物品刊登到 ValeTrade，
        買家用屬性條件精準搜尋，聯絡賣家後在遊戲內完成交易。
      </section>
    </div>
  );
}
