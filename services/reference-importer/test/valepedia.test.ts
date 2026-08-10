import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseEffectText } from '../src/adapters/valepedia/effectParser.js';
import { ValepediaSourceAdapter } from '../src/adapters/valepedia/ValepediaSourceAdapter.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

test('effect parser: numeric stats with percent and refine scaling', () => {
  // Tempo Gem
  const tempo = parseEffectText('攻擊速度: +5% + (1% × 精煉等級)AtkSpd節奏');
  assert.deepEqual(tempo.attributes, [
    { key: 'ATTACK_SPEED', value: 5, per_refine: false },
    { key: 'ATTACK_SPEED', value: 1, per_refine: true },
  ]);

  // Abomination Card
  const abom = parseEffectText('Atk: + (1 × 精煉等級), DEF: - (1% × 精煉等級)');
  assert.deepEqual(abom.attributes, [
    { key: 'ATK', value: 1, per_refine: true },
    { key: 'DEF_PERCENT', value: -1, per_refine: true },
  ]);

  // Cosmic Entity Card
  const cosmic = parseEffectText('MATK: +10%, ATK: +10%, HP: -25%, MP: -25%');
  assert.deepEqual(cosmic.attributes.map((a) => [a.key, a.value]), [
    ['MATK_PERCENT', 10], ['ATK_PERCENT', 10], ['MAX_HP', -25], ['MAX_MP', -25],
  ]);
});

test('effect parser: immunities, flat values, unparsed fallback', () => {
  const imm = parseEffectText('狀態免疫：緩速, 狀態免疫：流血');
  assert.deepEqual(imm.attributes.map((a) => a.key), ['SLOW_IMMUNITY', 'BLEED_IMMUNITY']);

  const kb = parseEffectText('免疫擊退');
  assert.equal(kb.attributes[0].key, 'KNOCKBACK_IMMUNITY');

  const mp = parseEffectText('擊殺時魔力: +10');
  assert.deepEqual(mp.attributes, [{ key: 'MP_ON_KILL', value: 10, per_refine: false }]);

  // unparseable effects preserved, not dropped
  const weird = parseEffectText('授予 Lv.1 真視之眼');
  assert.equal(weird.attributes.length, 0);
  assert.deepEqual(weird.unparsed, ['授予 Lv.1 真視之眼']);
});

test('valepedia adapter: decodes Broad Sword equipment payload', async () => {
  const adapter = new ValepediaSourceAdapter(join(ROOT, 'data', 'reference', 'valepedia'));
  const { records } = await adapter.fetch('2026-08-10');

  const sword = records.find((r) => r.name_en === 'Broad Sword');
  assert.ok(sword, 'Broad Sword parsed from payload');
  const attrs = Object.fromEntries(
    sword!.attributes!.map((a) => [`${a.key}${a.per_refine ? ':ref' : ''}`, a.value]),
  );
  assert.equal(attrs['ATK'], 20);          // Attack +20
  assert.equal(attrs['ATK:ref'], 2);       // +2 × refine
  assert.equal(attrs['BLOCK'], 10);        // Block +10%
  assert.equal(attrs['MAX_HP_FLAT'], 100); // HP +100
  assert.equal(attrs['MAX_HP'], 10);       // HP +10%
  assert.equal(attrs['ATTACK_SPEED'], -10);// AtkSpd -10%
  assert.equal(attrs['SOCKETS'], 3);

  // gems + cards from list snapshots
  assert.equal(records.filter((r) => r.category === 'gem').length, 15);
  assert.equal(records.filter((r) => r.category === 'card').length, 15);
  const angel = records.find((r) => r.name_en === 'Angel Card');
  assert.equal(angel?.subcategory, 'weapon');
  assert.deepEqual(angel?.attributes, [{ key: 'HOLY_DAMAGE', value: 6, per_refine: false }]);
});
