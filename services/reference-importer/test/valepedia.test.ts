import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import {
  parseCardName, parseGemName, parseEquipListText, parseTaggedEffects, equipSlot, EQUIP_TYPE,
} from '../src/adapters/valepedia/bulkParser.js';
import { ValepediaSourceAdapter } from '../src/adapters/valepedia/ValepediaSourceAdapter.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const ENUMS = ['Atk','Matk','DefMult','MatkMult','AtkMult','HpMult','MpMult','StatusImmune','AtkSpd','SkillDamage','DamageElement','ElementResist','Healing','ReflectDamage'];

test('bulk name parsers', () => {
  assert.deepEqual(parseEquipListText('頭飾Head啾啾帽Chirpy Hat'),
    { typeLabel: 'Head', name_zh: '啾啾帽', name_en: 'Chirpy Hat' });
  assert.deepEqual(parseCardName('盾牌咬人花卡片Chompbloom Card'),
    { slot: 'offhand', name_zh: '咬人花卡片', name_en: 'Chompbloom Card' });
  assert.deepEqual(parseGemName('壓制力場寶石Suppression Field Gem'),
    { name_zh: '壓制力場寶石', name_en: 'Suppression Field Gem' });
  assert.deepEqual(parseGemName('屍體爆炸寶石'), {}); // zh-only rows fall back to id in adapter
  assert.equal(equipSlot(EQUIP_TYPE[0]), 'weapon');
  assert.equal(equipSlot(EQUIP_TYPE[21]), 'chest');
});

test('tagged effect parser', () => {
  // refine-scaled pair with enum tags
  const abom = parseTaggedEffects('Atk: + (1 × 精煉等級)AtkDEF: - (1% × 精煉等級)DefMult', ENUMS);
  assert.deepEqual(abom.attributes, [
    { key: 'ATK', value: 1, per_refine: true },
    { key: 'DEF_PERCENT', value: -1, per_refine: true },
  ]);

  // base% + per-refine% with trailing zh glossary word
  const tempo = parseTaggedEffects('攻擊速度: +5% + (1% × 精煉等級)AtkSpd節奏', ENUMS);
  assert.deepEqual(tempo.attributes, [
    { key: 'ATTACK_SPEED', value: 5 },
    { key: 'ATTACK_SPEED', value: 1, per_refine: true },
  ]);

  // status resist via StatusImmune tag
  const resist = parseTaggedEffects('抵抗 緩速Slow：+50%StatusImmune抵抗 流血Bleeding：+50%StatusImmune', ENUMS);
  assert.deepEqual(resist.attributes, [
    { key: 'SLOW_RESIST', value: 50 },
    { key: 'BLEED_RESIST', value: 50 },
  ]);

  // unmapped enum preserved as raw
  const skill = parseTaggedEffects('火箭術Firebolt傷害: + (2% × 精煉等級)SkillDamage', ENUMS);
  assert.equal(skill.attributes.length, 0);
  assert.ok(skill.raw[0].includes('SkillDamage'));
});

test('bulk adapter: full snapshot import', async () => {
  const adapter = new ValepediaSourceAdapter(join(ROOT, 'data', 'reference', 'valepedia'));
  const { records, meta } = await adapter.fetch('2026-08-10');

  assert.equal(records.length, 975, 'all 576+270+129 records imported, none dropped');
  assert.equal(meta.version_tag, '2026-08-10+game-0.30.10');
  const byCat = records.reduce((m, r) => (m[r.category] = (m[r.category] ?? 0) + 1, m), {} as Record<string, number>);
  assert.deepEqual(byCat, { equipment: 576, card: 270, gem: 129 });

  // Broad Sword end-to-end
  const sword = records.find((r) => r.name_en === 'Broad Sword')!;
  const attrs = Object.fromEntries(sword.attributes!.map((a) => [`${a.key}${a.per_refine ? ':ref' : ''}`, a.value]));
  assert.equal(attrs['ATK'], 20);
  assert.equal(attrs['ATK:ref'], 2);
  assert.equal(attrs['BLOCK'], 10);
  assert.equal(attrs['SOCKETS'], 3);
  assert.equal(sword.equipment_slot, 'weapon');
  assert.equal(sword.name_zh_tw, '闊劍');

  // zh-TW coverage: names present for nearly all records
  const zh = records.filter((r) => r.name_zh_tw).length;
  assert.ok(zh / records.length > 0.99, `zh-TW coverage ${zh}/${records.length}`);

  // fallback gems present with id-based EN name
  assert.ok(records.some((r) => r.name_en === 'CorpseExplosion Gem' && r.name_zh_tw === '屍體爆炸寶石'));
});
