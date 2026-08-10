import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatAttr, getItem } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function ItemDetail({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const item = getItem(decodeURIComponent(key));
  if (!item) notFound();

  const base = item.attributes.filter((a) => !a.per_refine);
  const refine = item.attributes.filter((a) => a.per_refine);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/database" className="text-sm text-dim hover:text-slate-200">← 回資料庫</Link>

      <div className="panel p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{item.name_zh_tw ?? item.name_en}</h1>
          <div className="text-dim">{item.name_en}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="chip">{item.category}</span>
            {item.subcategory && <span className="chip">{item.subcategory}</span>}
            {item.equipment_slot && <span className="chip">部位: {item.equipment_slot}</span>}
            <span className="chip">{item.canonical_key}</span>
          </div>
        </div>

        {base.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-dim mb-2">基礎屬性</h2>
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
            <h2 className="text-sm font-semibold text-dim mb-2">精煉成長（每 +1）</h2>
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

        <div className="pt-2 border-t border-line text-xs text-dim">
          資料來源：公開遊戲資訊整理（game v0.30.10）
          {item.source_url && (
            <>
              {' · '}
              <a className="underline hover:text-slate-200" href={item.source_url} target="_blank" rel="noreferrer">
                參考頁面
              </a>
            </>
          )}
        </div>
      </div>

      <div className="panel p-4 text-sm text-dim">
        此物品的市集刊登功能即將推出 — 屆時可查看目前在售的{' '}
        <b className="text-slate-200">{item.name_zh_tw ?? item.name_en}</b>{' '}
        與歷史價格。
      </div>
    </div>
  );
}
