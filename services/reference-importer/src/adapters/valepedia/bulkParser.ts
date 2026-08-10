import type { RawAttribute, RawItemRecord } from '../../types.js';

/** Parser for the bulk snapshot (bulk_snapshot.json) collected from valepedia.com public pages. */

export interface BulkSnapshot {
  source: string;
  game_version: string;
  fetched_at: string;
  counts: { equipments: number; cards: number; gems: number };
  stat_enum: Record<string, string>;
  equip_list: [string, string][];
  equipments: Record<string, BulkEquipment>;
  cards: [string, string][];
  gems: [string, string][];
}

export interface BulkEquipment {
  id: string; en: string; zhtw: string | null;
  type: number | null; slots: number | null; lvl: number | null;
  elem: number | null; uniq: boolean; set: string | null; mat: string | null;
  drop: number | null;
  ps: StatTuple[]; ss: StatTuple[];
  sub: unknown; // holds weapon class string ("Melee"/"Ranged") in observed payloads
}

/** [statType, value, valueLv(per refine), valueStr, chance] */
export type StatTuple = [number, number | null, number | null, string | null, number | null];

/** numeric equipment type -> site label (derived from list pages, verified over all 576 items) */
export const EQUIP_TYPE: Record<number, string> = {
  0: 'Sword', 1: 'Dagger', 2: 'Wand', 3: 'Spear', 4: 'Axe', 5: 'Mace', 6: 'Book',
  7: 'Pistol', 8: 'Bow', 9: 'Scythe', 10: 'Instrument', 11: 'Twinblade',
  17: 'Shield', 18: 'Head', 19: 'Legs', 20: 'Feet', 21: 'Chest', 22: 'Accessory',
  23: 'Eyewear', 24: 'Back', 25: 'Rifle', 26: 'Shotgun', 27: 'Launcher',
  28: 'GatlingGun', 29: 'Katar',
};

const WEAPON_TYPES = new Set(['Sword','Dagger','Wand','Spear','Axe','Mace','Book','Pistol','Bow',
  'Scythe','Instrument','Twinblade','Rifle','Shotgun','Launcher','GatlingGun','Katar']);

export function equipSlot(typeLabel: string | undefined): string | undefined {
  if (!typeLabel) return undefined;
  if (WEAPON_TYPES.has(typeLabel)) return 'weapon';
  const m: Record<string, string> = {
    Shield: 'offhand', Head: 'head', Legs: 'legs', Feet: 'feet', Chest: 'chest',
    Accessory: 'accessory', Eyewear: 'eyewear', Back: 'back',
  };
  return m[typeLabel];
}

/**
 * stat enum id -> canonical attribute. `pct` marks values that are percentages.
 * Unmapped stat types are preserved as raw text (never silently dropped).
 */
export const STAT_CANONICAL: Record<number, { key: string; pct?: boolean; bool?: boolean }> = {
  7: { key: 'MAX_HP_FLAT' },
  8: { key: 'MAX_MP_FLAT' },
  9: { key: 'ATK' },
  10: { key: 'MATK' },
  11: { key: 'DEF' },
  12: { key: 'MDEF' },
  13: { key: 'HIT' },
  14: { key: 'FLEE' },
  15: { key: 'CRITICAL_CHANCE', pct: true },
  20: { key: 'HEALTH_ON_HIT' },
  21: { key: 'MANA_ON_HIT' },
  25: { key: 'RANGE' },
  52: { key: 'CRIT_DAMAGE', pct: true },
  59: { key: 'HP_REGEN' },
  61: { key: 'MP_REGEN' },
  63: { key: 'ATTACK_SPEED', pct: true },
  64: { key: 'CAST_SPEED', pct: true },
  65: { key: 'MOVEMENT_SPEED', pct: true },
  67: { key: 'HEAL_POWER', pct: true },
  68: { key: 'HEALING_RECEIVED', pct: true },
  69: { key: 'ATK_PERCENT', pct: true },
  70: { key: 'MATK_PERCENT', pct: true },
  71: { key: 'MAX_HP', pct: true },
  72: { key: 'MAX_MP', pct: true },
  73: { key: 'DEF_PERCENT', pct: true },
  74: { key: 'MDEF_PERCENT', pct: true },
  75: { key: 'HP_REGEN_PERCENT', pct: true },
  76: { key: 'MP_REGEN_PERCENT', pct: true },
  80: { key: 'DOUBLE_ATTACK', pct: true },
  81: { key: 'ENERGY_SHIELD' },
  85: { key: 'BLOCK', pct: true },
  86: { key: 'REFLECT_DAMAGE', pct: true },
  87: { key: 'DUAL_WIELD', bool: true },
  88: { key: 'EXP_RATE', pct: true },
  89: { key: 'DROP_RATE', pct: true },
  101: { key: 'WEIGHT_LIMIT' },
  120: { key: 'CRIT_RESIST' },
  121: { key: 'PERFECT_DODGE', pct: true },
};

/** zh status name -> canonical *_RESIST attribute (card "抵抗 X：+n%") */
const STATUS_RESIST: Record<string, string> = {
  流血: 'BLEED_RESIST', 緩速: 'SLOW_RESIST', 冰凍: 'FREEZE_RESIST', 詛咒: 'CURSE_RESIST',
  中毒: 'POISON_RESIST', 腐朽: 'DECAY_RESIST', 燃燒: 'BURN_RESIST', 暈眩: 'STUN_RESIST',
};

const CARD_SLOTS: Record<string, string> = {
  武器: 'weapon', 胸甲: 'chest', 頭飾: 'head', 鞋子: 'feet', 盾牌: 'offhand', 飾品: 'accessory',
};

export interface ParsedName { name_zh?: string; name_en?: string; slot?: string }

/** "頭飾Head啾啾帽Chirpy Hat" -> { slotLabel:'Head', name_zh:'啾啾帽', name_en:'Chirpy Hat' } */
export function parseEquipListText(text: string): { typeLabel?: string; name_zh?: string; name_en?: string } {
  const m = text.match(/^([一-鿿]+)([A-Za-z]+)(.*)$/);
  if (!m) return {};
  const rest = m[3];
  const nm = rest.match(/^(.*?)([A-Za-z][A-Za-z0-9'’\-.! ]*)$/);
  return {
    typeLabel: m[2],
    name_zh: nm ? nm[1] || undefined : undefined,
    name_en: nm ? nm[2].trim() : undefined,
  };
}

/** "盾牌咬人花卡片Chompbloom Card" -> slot 盾牌, zh 咬人花卡片, en Chompbloom Card */
export function parseCardName(text: string): ParsedName {
  const m = text.match(/^([一-鿿]{2})(.*?卡片)([A-Za-z].* Card)$/);
  if (!m) return {};
  return { slot: CARD_SLOTS[m[1]] ?? m[1], name_zh: m[2], name_en: m[3].trim() };
}

/** "壓制力場寶石Suppression Field Gem" -> zh 壓制力場寶石, en Suppression Field Gem */
export function parseGemName(text: string): ParsedName {
  const m = text.match(/^(.*寶石)([A-Za-z].* Gem)$/);
  if (!m) return {};
  return { name_zh: m[1], name_en: m[2].trim() };
}

export interface ParsedEffects { attributes: RawAttribute[]; raw: string[] }

/**
 * Parse enum-tagged effect text from list pages, e.g.
 *   "Atk: + (1 × 精煉等級)AtkDEF: - (1% × 精煉等級)DefMult"
 *   "抵抗 流血Bleeding：+50%StatusImmune"
 *   "攻擊速度: +5% + (1% × 精煉等級)AtkSpd節奏"
 * Segments end with a PascalCase stat-enum tag. Unparsed parts go to `raw`.
 */
export function parseTaggedEffects(text: string, enumNames: string[]): ParsedEffects {
  const attributes: RawAttribute[] = [];
  const raw: string[] = [];
  if (!text) return { attributes, raw };

  // Build a splitter that cuts AFTER each enum tag occurrence.
  const names = [...enumNames].sort((a, b) => b.length - a.length);
  const tagRe = new RegExp(`(${names.join('|')})`, 'g');
  // Split into segments, each ending with its tag.
  const segments: { body: string; tag: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(tagRe)) {
    const end = m.index! + m[1].length;
    // A tag must be followed by CJK, '+', '-', end, or an uppercase start of next label
    const next = text[end];
    if (next !== undefined && /[a-z0-9%）)]/.test(next)) continue; // inside a word — not a tag
    segments.push({ body: text.slice(last, m.index!), tag: m[1] });
    last = end;
  }
  if (last < text.length) {
    const tail = text.slice(last).trim();
    if (tail && !/^[一-鿿]{1,4}$/.test(tail)) raw.push(tail); // trailing glossary word ok to drop if short CJK
  }

  const byName = new Map(Object.entries(STAT_CANONICAL).map(([, v]) => [v.key, v]));
  const enumToCanonical = new Map<string, { key: string; pct?: boolean; bool?: boolean }>();
  for (const [id, def] of Object.entries(STAT_CANONICAL)) {
    // enumNames indexed by id elsewhere; mapping done via ENUM_BY_NAME below
  }

  for (const seg of segments) {
    const body = seg.body.trim();
    if (seg.tag === 'StatusImmune') {
      const rm = body.match(/抵抗\s*([一-鿿]+)[A-Za-z]*[：:]\s*\+?(\d+)%?/);
      if (rm && STATUS_RESIST[rm[1]]) {
        attributes.push({ key: STATUS_RESIST[rm[1]], value: parseInt(rm[2], 10) });
        continue;
      }
      const im = body.match(/狀態免疫[：:]\s*([一-鿿]+)/);
      if (im && STATUS_RESIST[im[1]]) {
        attributes.push({ key: STATUS_RESIST[im[1]].replace('_RESIST', '_IMMUNITY'), value: true });
        continue;
      }
      raw.push(body + seg.tag);
      continue;
    }

    const canonical = ENUM_NAME_CANONICAL[seg.tag];
    if (!canonical) { raw.push(body + '⟨' + seg.tag + '⟩'); continue; }

    // numeric patterns: base and/or per-refine
    const nums = body.match(/[：:]\s*([+\-])?\s*(?:(\d+(?:\.\d+)?)(%?))?\s*(?:\+?\s*\(\s*(\d+(?:\.\d+)?)(%?)\s*×\s*精煉等級\s*\))?\s*$/);
    if (!nums || (nums[2] === undefined && nums[4] === undefined)) {
      if (canonical.bool) { attributes.push({ key: canonical.key, value: true }); continue; }
      raw.push(body + '⟨' + seg.tag + '⟩');
      continue;
    }
    const sign = nums[1] === '-' ? -1 : 1;
    if (nums[2] !== undefined) attributes.push({ key: canonical.key, value: sign * parseFloat(nums[2]) });
    if (nums[4] !== undefined) attributes.push({ key: canonical.key, value: sign * parseFloat(nums[4]), per_refine: true });
  }
  return { attributes, raw };
}

/** enum NAME -> canonical mapping (derived from STAT_CANONICAL + the 220-entry stat enum). */
export const ENUM_NAME_CANONICAL: Record<string, { key: string; pct?: boolean; bool?: boolean }> = {
  Hp: { key: 'MAX_HP_FLAT' }, Mp: { key: 'MAX_MP_FLAT' },
  Atk: { key: 'ATK' }, Matk: { key: 'MATK' }, Def: { key: 'DEF' }, Mdef: { key: 'MDEF' },
  Hit: { key: 'HIT' }, Flee: { key: 'FLEE' }, Crit: { key: 'CRITICAL_CHANCE', pct: true },
  HealthOnHit: { key: 'HEALTH_ON_HIT' }, ManaOnHit: { key: 'MANA_ON_HIT' },
  Range: { key: 'RANGE' }, CritDamage: { key: 'CRIT_DAMAGE', pct: true },
  HpRegen: { key: 'HP_REGEN' }, MpRegen: { key: 'MP_REGEN' },
  AtkSpd: { key: 'ATTACK_SPEED', pct: true }, CastSpd: { key: 'CAST_SPEED', pct: true },
  MoveSpd: { key: 'MOVEMENT_SPEED', pct: true },
  Healing: { key: 'HEAL_POWER', pct: true }, HealingReceived: { key: 'HEALING_RECEIVED', pct: true },
  AtkMult: { key: 'ATK_PERCENT', pct: true }, MatkMult: { key: 'MATK_PERCENT', pct: true },
  HpMult: { key: 'MAX_HP', pct: true }, MpMult: { key: 'MAX_MP', pct: true },
  DefMult: { key: 'DEF_PERCENT', pct: true }, MdefMult: { key: 'MDEF_PERCENT', pct: true },
  HpRegenMult: { key: 'HP_REGEN_PERCENT', pct: true }, MpRegenMult: { key: 'MP_REGEN_PERCENT', pct: true },
  DoubleAttack: { key: 'DOUBLE_ATTACK', pct: true }, EnergyShield: { key: 'ENERGY_SHIELD' },
  Block: { key: 'BLOCK', pct: true }, ReflectDamage: { key: 'REFLECT_DAMAGE', pct: true },
  DualWield: { key: 'DUAL_WIELD', bool: true },
  ExpRate: { key: 'EXP_RATE', pct: true }, DropRate: { key: 'DROP_RATE', pct: true },
  WeightLimit: { key: 'WEIGHT_LIMIT' }, CritDef: { key: 'CRIT_RESIST' },
  PerfectDodge: { key: 'PERFECT_DODGE', pct: true },
};

/** Convert one bulk equipment entry (+ its list-page names) into a RawItemRecord. */
export function equipmentToRecord(
  e: BulkEquipment,
  listText: string | undefined,
  warnings: string[],
): RawItemRecord {
  const parsed = listText ? parseEquipListText(listText) : {};
  const typeLabel = e.type !== null && e.type !== undefined ? EQUIP_TYPE[e.type] : parsed.typeLabel;
  const attributes: RawAttribute[] = [];
  const rawStats: string[] = [];

  for (const grp of [e.ps, e.ss]) {
    for (const [t, v, vLv, vStr] of grp ?? []) {
      const map = STAT_CANONICAL[t];
      if (!map) {
        rawStats.push(`${t}:${v ?? ''}${vLv ? `+${vLv}/ref` : ''}${vStr ? `(${vStr})` : ''}`);
        continue;
      }
      if (map.bool) { attributes.push({ key: map.key, value: true }); continue; }
      if (typeof v === 'number' && v !== 0) attributes.push({ key: map.key, value: v });
      if (typeof vLv === 'number' && vLv !== 0) attributes.push({ key: map.key, value: vLv, per_refine: true });
    }
  }
  if (typeof e.slots === 'number' && e.slots > 0) attributes.push({ key: 'SOCKETS', value: e.slots });
  if (typeof e.lvl === 'number' && e.lvl > 0) attributes.push({ key: 'REQUIRED_LEVEL', value: e.lvl });
  if (rawStats.length) warnings.push(`${e.en}: unmapped stats ${rawStats.join(' ')}`);

  const descBits = [
    typeLabel ? `type: ${typeLabel}` : null,
    typeof e.sub === 'string' ? `class: ${e.sub}` : null,
    e.elem ? `element_id: ${e.elem}` : null,
    e.uniq ? 'unique' : null,
    e.set ? `set: ${e.set}` : null,
    rawStats.length ? `raw_stats: ${rawStats.join(' ')}` : null,
  ].filter(Boolean);

  return {
    name_en: (parsed.name_en && parsed.name_en.length >= 2 ? parsed.name_en : e.en) as string,
    name_zh_tw: parsed.name_zh,
    category: 'equipment',
    subcategory: typeLabel?.toLowerCase(),
    equipment_slot: equipSlot(typeLabel),
    description: descBits.length ? descBits.join('; ') : undefined,
    attributes,
    source_external_id: e.id,
    source_url: `https://www.valepedia.com/database/equipments/${encodeURIComponent(e.id)}`,
  };
}
