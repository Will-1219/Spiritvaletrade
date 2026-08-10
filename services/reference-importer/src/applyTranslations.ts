/**
 * Overlay community zh-TW translations (SpiritZh patch) onto the published catalog.
 *
 * Priority: SpiritZh dict (what players actually see in-game with the popular
 * patch) > valepedia names. English names stay canonical for search.
 *
 * Also repairs 6 known name_en parse edge cases by falling back to the
 * source_external_id / camel-case-split dict lookups.
 *
 * Usage: tsx src/applyTranslations.ts <path-to-SpiritZh_dict.txt>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { makeCanonicalKey } from './pipeline/canonicalize.js';
import type { Category } from './types.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const dictPath = process.argv[2];
if (!dictPath) {
  console.error('usage: tsx src/applyTranslations.ts <SpiritZh_dict.txt>');
  process.exit(1);
}

// ---- load dict (English=中文 lines, BOM + // comments) ----
const dict = new Map<string, string>();
for (const raw of readFileSync(dictPath, 'utf8').replace(/^﻿/, '').split('\n')) {
  const line = raw.trimEnd();
  if (!line || line.startsWith('//') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  dict.set(line.slice(0, i).trim(), line.slice(i + 1).trim());
}
console.log(`[dict] ${dict.size} entries from SpiritZh patch`);

const splitCamel = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2');

const catalogPath = join(ROOT, 'data', 'published', 'catalog.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));

let replaced = 0, kept = 0, renamed = 0, missing: string[] = [];
const usedSubset: Record<string, string> = {};

for (const it of catalog.items) {
  // ---- repair name_en when dict/external id knows better ----
  let zh = dict.get(it.name_en);
  if (!zh) {
    const candidates = [
      it.source_external_id,
      splitCamel(it.name_en),
      it.source_external_id ? splitCamel(it.source_external_id) : undefined,
    ].filter((c): c is string => !!c && c !== it.name_en);
    for (const cand of candidates) {
      const z = dict.get(cand);
      if (z) {
        console.log(`[rename] "${it.name_en}" -> "${cand}"`);
        it.name_en = cand;
        it.canonical_key = makeCanonicalKey(cand, it.category as Category);
        zh = z;
        renamed++;
        break;
      }
    }
  }
  if (zh) {
    usedSubset[it.name_en] = zh;
    if (it.name_zh_tw !== zh) replaced++;
    else kept++;
    it.name_zh_tw = zh;
    it.zh_source = 'spiritzh-v3.64.3';
  } else {
    missing.push(it.name_en);
    if (it.name_zh_tw) it.zh_source = 'valepedia';
  }
}

catalog.translation = {
  source: 'SpiritZh 繁中翻譯補丁 v3.64.3（社群漢化,名詞對照）',
  applied_at: new Date().toISOString(),
  coverage: `${catalog.items.length - missing.length}/${catalog.items.length}`,
};

writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));

// save only the subset we actually use, with attribution (not the full patch dict)
const outDir = join(ROOT, 'data', 'reference', 'spiritzh', 'v3.64.3');
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, 'item_names.zh-tw.json'),
  JSON.stringify(
    {
      source: 'SpiritZh 繁體中文翻譯補丁 v3.64.3(社群翻譯);僅擷取本站目錄物品名詞對照',
      count: Object.keys(usedSubset).length,
      names: usedSubset,
    },
    null, 2,
  ),
);

console.log(`[apply] replaced=${replaced} unchanged=${kept} renamed=${renamed} missing=${missing.length}`);
if (missing.length) console.log('[missing]', missing.join(', '));
