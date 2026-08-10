import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalize, makeCanonicalKey, normalizeCategory, stableStringify } from '../src/pipeline/canonicalize.js';
import { validateCatalog } from '../src/pipeline/validate.js';
import { diffCatalogs, requiresReview } from '../src/pipeline/diff.js';
import type { AttributeDef, RawItemRecord } from '../src/types.js';

const DICT: AttributeDef[] = [
  { canonical_key: 'VIT', name_en: 'VIT', value_type: 'flat', searchable: true, refine_scalable: false },
  { canonical_key: 'MAX_HP', name_en: 'Max HP', value_type: 'percent', searchable: true, refine_scalable: true },
  { canonical_key: 'BLEED_IMMUNITY', name_en: 'Bleed Immunity', value_type: 'boolean', searchable: true, refine_scalable: false },
  { canonical_key: 'DOUBLE_ATTACK', name_en: 'Double Attack', value_type: 'percent', searchable: true, refine_scalable: true },
];

const titanplate: RawItemRecord = {
  name_en: 'Titanplate', category: 'equipment', subcategory: 'Armor', equipment_slot: 'Body',
  attributes: [{ key: 'VIT', value: 12 }, { key: 'MAX_HP', value: 8 }],
};

test('canonical key generation', () => {
  assert.equal(makeCanonicalKey('Titanplate', 'equipment'), 'ITEM_TITANPLATE');
  assert.equal(makeCanonicalKey('Night Fiend Card', 'card'), 'CARD_NIGHT_FIEND');
  assert.equal(makeCanonicalKey('Echo Gem', 'gem'), 'GEM_ECHO');
  assert.equal(makeCanonicalKey("Guardian's Oath-Ring", 'equipment'), 'ITEM_GUARDIAN_S_OATH_RING');
});

test('category normalization', () => {
  assert.equal(normalizeCategory(' Cards '), 'card');
  assert.equal(normalizeCategory('GEMS'), 'gem');
  assert.equal(normalizeCategory('unknown-thing'), undefined);
});

test('canonicalize produces stable hash regardless of key order', () => {
  const a = canonicalize(titanplate, 'manual');
  const b = canonicalize(
    { ...titanplate, attributes: [...titanplate.attributes!] }, 'manual',
  );
  assert.equal(a.source_hash, b.source_hash);
  assert.equal(a.needs_verification, true);
  assert.equal(a.subcategory, 'armor');
  assert.equal(stableStringify({ b: 1, a: 2 }), stableStringify({ a: 2, b: 1 }));
});

test('validate catches unknown attribute, dup keys, bad boolean', () => {
  const good = canonicalize(titanplate, 'manual');
  const dupe = canonicalize(titanplate, 'manual');
  const badAttr = canonicalize(
    { name_en: 'Mystery Helm', category: 'equipment', equipment_slot: 'head',
      attributes: [{ key: 'NOT_A_STAT', value: 1 }] }, 'manual');
  const issues = validateCatalog([good, dupe, badAttr], DICT);
  assert.ok(issues.some((i) => i.message.includes('duplicate canonical_key')));
  assert.ok(issues.some((i) => i.message.includes('not in attribute dictionary')));
  const clean = validateCatalog([good], DICT).filter((i) => i.severity === 'error');
  assert.equal(clean.length, 0);
});

test('diff: added / changed / removed / unknown', () => {
  const v1 = [
    canonicalize({ name_en: 'Echo Gem', category: 'gem',
      attributes: [{ key: 'DOUBLE_ATTACK', value: 3, per_refine: true }] }, 'manual'),
    canonicalize({ name_en: 'Old Relic', category: 'material' }, 'manual'),
  ];
  // Echo Gem effect changes 3 -> 4 (the "Echo Gem rule"), Old Relic removed, Titanplate added
  const v2 = [
    canonicalize({ name_en: 'Echo Gem', category: 'gem',
      attributes: [{ key: 'DOUBLE_ATTACK', value: 4, per_refine: true }] }, 'manual'),
    canonicalize(titanplate, 'manual'),
  ];
  const d = diffCatalogs(v1, v2);
  assert.equal(d.added.length, 1);
  assert.equal(d.added[0].canonical_key, 'ITEM_TITANPLATE');
  assert.equal(d.changed.length, 1);
  assert.equal(d.changed[0].canonical_key, 'GEM_ECHO');
  assert.notEqual(d.changed[0].old_hash, d.changed[0].new_hash);
  assert.equal(d.removed.length, 1);
  assert.equal(d.removed[0].canonical_key, 'MATERIAL_OLD_RELIC');
  assert.ok(requiresReview(d), 'UPDATED/REMOVED must require admin review');

  const freshOnly = diffCatalogs([], v2);
  assert.equal(freshOnly.added.length, 2);
  assert.ok(!requiresReview(freshOnly), 'pure additions do not require review');
});

test('diff flags category flip as UNKNOWN', () => {
  const cur = [canonicalize({ name_en: 'Echo', category: 'gem' }, 'manual')];
  const inc = [{ ...canonicalize({ name_en: 'Echo', category: 'gem' }, 'manual'), category: 'card' as const }];
  const d = diffCatalogs(cur, inc);
  assert.equal(d.unknown.length, 1);
  assert.ok(requiresReview(d));
});
