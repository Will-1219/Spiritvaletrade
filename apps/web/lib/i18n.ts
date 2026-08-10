import { cookies } from 'next/headers';
import type { CatalogItem } from './catalog';

export type Lang = 'zh' | 'en';

export async function getLang(): Promise<Lang> {
  const c = await cookies();
  return c.get('vt_lang')?.value === 'en' ? 'en' : 'zh';
}

/** Primary display name for the current language. English stays canonical for search. */
export function displayName(item: Pick<CatalogItem, 'name_en' | 'name_zh_tw'>, lang: Lang): string {
  return lang === 'en' ? item.name_en : (item.name_zh_tw ?? item.name_en);
}

/** Secondary (small) name line. */
export function subName(item: Pick<CatalogItem, 'name_en' | 'name_zh_tw'>, lang: Lang): string {
  return lang === 'en' ? (item.name_zh_tw ?? '') : item.name_en;
}

export const T = {
  zh: {
    db: '物品資料庫', market: '市集', listNew: '刊登物品', search: '搜尋',
    searchPh: '搜尋物品名稱（中英文皆可）…', allCats: '全部分類', allSlots: '全部部位',
    apply: '套用篩選', clear: '清除', results: '筆結果', baseAttrs: '基礎屬性',
    refineGrowth: '精煉成長（每 +1）', backToDb: '← 回資料庫',
  },
  en: {
    db: 'Item Database', market: 'Market', listNew: 'Create Listing', search: 'Search',
    searchPh: 'Search items (EN / 中文)…', allCats: 'All categories', allSlots: 'All slots',
    apply: 'Apply filters', clear: 'Clear', results: 'results', baseAttrs: 'Base attributes',
    refineGrowth: 'Refine growth (per +1)', backToDb: '← Back to database',
  },
} as const;
