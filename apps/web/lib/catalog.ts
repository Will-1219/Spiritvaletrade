import fs from 'node:fs';
import path from 'node:path';

export interface AttrValue {
  attribute_key: string;
  value_num?: number;
  value_text?: string;
  per_refine: boolean;
}

export interface CatalogItem {
  canonical_key: string;
  name_en: string;
  name_zh_tw?: string;
  category: string;
  subcategory?: string;
  equipment_slot?: string;
  rarity?: string;
  description?: string;
  source: string;
  source_url?: string;
  attributes: AttrValue[];
}

interface Catalog {
  version_tag: string;
  published_at: string;
  items: CatalogItem[];
}

let cached: Catalog | null = null;

export function getCatalog(): Catalog {
  if (!cached) {
    const p = path.join(process.cwd(), 'data', 'catalog.json');
    cached = JSON.parse(fs.readFileSync(p, 'utf8')) as Catalog;
  }
  return cached;
}

export function getItem(key: string): CatalogItem | undefined {
  return getCatalog().items.find((i) => i.canonical_key === key);
}

export const CATEGORIES = [
  { key: 'equipment', zh: '裝備' },
  { key: 'card', zh: '卡片' },
  { key: 'gem', zh: '寶石' },
] as const;

export interface AttrFilter {
  key: string;
  min: number;
}

export interface Query {
  q?: string;
  cat?: string;
  slot?: string;
  attrs: AttrFilter[];
}

export function searchItems(query: Query): CatalogItem[] {
  const { items } = getCatalog();
  const q = query.q?.trim().toLowerCase();
  return items.filter((it) => {
    if (query.cat && it.category !== query.cat) return false;
    if (query.slot && it.equipment_slot !== query.slot) return false;
    if (q) {
      const hay = `${it.name_en} ${it.name_zh_tw ?? ''} ${it.canonical_key}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    for (const f of query.attrs) {
      const rows = it.attributes.filter((a) => a.attribute_key === f.key);
      if (!rows.length) return false;
      // total value at +0 refine must meet the minimum (base rows only)
      const base = rows.filter((r) => !r.per_refine).reduce((s, r) => s + (r.value_num ?? 0), 0);
      const hasBool = rows.some((r) => r.value_text === 'true');
      if (!hasBool && base < f.min) return false;
    }
    return true;
  });
}

/** distinct searchable attribute keys present in the catalog, sorted by frequency */
export function attributeOptions(): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const it of getCatalog().items) {
    for (const a of it.attributes) {
      counts.set(a.attribute_key, (counts.get(a.attribute_key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export function slotOptions(): string[] {
  const s = new Set<string>();
  for (const it of getCatalog().items) if (it.equipment_slot) s.add(it.equipment_slot);
  return [...s].sort();
}

export function formatAttr(a: AttrValue): string {
  const pct = /PERCENT|SPEED|CHANCE|RATE|RESIST|BLOCK|DOUBLE|DODGE|MAX_HP$|MAX_MP$|DAMAGE$|HEAL/.test(
    a.attribute_key,
  );
  if (a.value_text === 'true') return '✓';
  const v = a.value_num ?? 0;
  const sign = v > 0 ? '+' : '';
  const unit = pct ? '%' : '';
  return a.per_refine ? `${sign}${v}${unit} ×精煉` : `${sign}${v}${unit}`;
}
