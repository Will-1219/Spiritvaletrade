import { createHash } from 'node:crypto';
import type { CanonicalItem, Category, RawItemRecord } from '../types.js';

const CATEGORY_PREFIX: Record<Category, string> = {
  equipment: 'ITEM',
  card: 'CARD',
  gem: 'GEM',
  artifact: 'ARTIFACT',
  material: 'MATERIAL',
  consumable: 'CONSUMABLE',
};

const CATEGORY_ALIASES: Record<string, Category> = {
  equipment: 'equipment', equip: 'equipment', gear: 'equipment', armor: 'equipment', weapon: 'equipment',
  card: 'card', cards: 'card',
  gem: 'gem', gems: 'gem',
  artifact: 'artifact', artifacts: 'artifact',
  material: 'material', materials: 'material', mat: 'material',
  consumable: 'consumable', consumables: 'consumable',
};

export function normalizeCategory(raw: string): Category | undefined {
  return CATEGORY_ALIASES[raw.trim().toLowerCase()];
}

/**
 * ITEM_TITANPLATE from ("Titanplate", equipment).
 * "Night Fiend Card" -> CARD_NIGHT_FIEND (redundant category word stripped).
 */
export function makeCanonicalKey(nameEn: string, category: Category): string {
  let slug = nameEn
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const prefix = CATEGORY_PREFIX[category];
  // Strip trailing category word to avoid CARD_NIGHT_FIEND_CARD
  const redundant = new RegExp(`_?${category.toUpperCase()}$`);
  slug = slug.replace(redundant, '').replace(/^_+|_+$/g, '');
  if (!slug) throw new Error(`Cannot derive canonical key from name "${nameEn}"`);
  return `${prefix}_${slug}`;
}

/** Stable stringify (sorted keys) so hashes are order-independent. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortValue);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortValue((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}

export function contentHash(record: Omit<CanonicalItem, 'source_hash'>): string {
  return createHash('sha256').update(stableStringify(record)).digest('hex').slice(0, 16);
}

export function canonicalize(raw: RawItemRecord, source: string): CanonicalItem {
  const category = normalizeCategory(raw.category);
  if (!category) throw new Error(`Unknown category "${raw.category}" for "${raw.name_en}"`);

  const attributes = (raw.attributes ?? []).map((a) => {
    const key = a.key.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    if (typeof a.value === 'number') {
      return { attribute_key: key, value_num: a.value, per_refine: a.per_refine ?? false };
    }
    if (typeof a.value === 'boolean') {
      return { attribute_key: key, value_text: String(a.value), per_refine: a.per_refine ?? false };
    }
    return { attribute_key: key, value_text: String(a.value), per_refine: a.per_refine ?? false };
  });

  const base = {
    canonical_key: makeCanonicalKey(raw.name_en, category),
    name_en: raw.name_en.trim(),
    name_zh_tw: raw.name_zh_tw?.trim(),
    category,
    subcategory: raw.subcategory?.trim().toLowerCase(),
    equipment_slot: raw.equipment_slot?.trim().toLowerCase(),
    rarity: raw.rarity?.trim().toLowerCase(),
    description: raw.description?.trim(),
    source,
    source_external_id: raw.source_external_id,
    source_url: raw.source_url,
    needs_verification: source !== 'official',
    attributes,
  };
  return { ...base, source_hash: contentHash(base) };
}
