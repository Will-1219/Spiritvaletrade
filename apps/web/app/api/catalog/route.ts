import { NextResponse } from 'next/server';
import { getCatalog } from '@/lib/catalog';

/** Compact catalog index for client-side instant search. Cached at the edge. */
export async function GET() {
  const { items, version_tag } = getCatalog();
  const compact = items.map((i) => ({
    k: i.canonical_key,
    en: i.name_en,
    zh: i.name_zh_tw ?? null,
    cn: (i as { name_zh_cn?: string }).name_zh_cn ?? null,
    c: i.category,
    s: i.equipment_slot ?? null,
    a: i.attributes.map((a) => [a.attribute_key, a.value_num ?? (a.value_text === 'true' ? 1 : 0), a.per_refine ? 1 : 0]),
  }));
  return NextResponse.json(
    { v: version_tag, items: compact },
    { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
  );
}
