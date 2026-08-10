import type { RawAttribute } from '../../types.js';

/**
 * Parses Valepedia zh-TW effect strings into canonical attributes.
 * Unparseable segments are returned in `unparsed` and kept as raw effect text —
 * never dropped silently.
 */
export interface ParsedEffects {
  attributes: RawAttribute[];
  unparsed: string[];
}

const STATUS_IMMUNITY: Record<string, string> = {
  流血: 'BLEED_IMMUNITY',
  緩速: 'SLOW_IMMUNITY',
  暈眩: 'STUN_IMMUNITY',
  易傷: 'VULNERABILITY_IMMUNITY',
};

/** stat label → { base attr, percent-variant attr } */
const STAT_LABELS: Record<string, { flat?: string; percent?: string }> = {
  Atk: { flat: 'ATK', percent: 'ATK_PERCENT' },
  ATK: { flat: 'ATK', percent: 'ATK_PERCENT' },
  MATK: { flat: 'MATK', percent: 'MATK_PERCENT' },
  DEF: { flat: 'DEF', percent: 'DEF_PERCENT' },
  HP: { flat: 'MAX_HP_FLAT', percent: 'MAX_HP' },
  MP: { flat: 'MAX_MP_FLAT', percent: 'MAX_MP' },
  攻擊速度: { percent: 'ATTACK_SPEED' },
  傷害反射: { percent: 'REFLECT_DAMAGE' },
  聖抗性: { percent: 'HOLY_RESISTANCE' },
  聖傷害: { percent: 'HOLY_DAMAGE' },
  治療: { percent: 'HEAL_POWER' },
  擊殺時魔力: { flat: 'MP_ON_KILL' },
};

export function parseEffectText(text: string): ParsedEffects {
  const attributes: RawAttribute[] = [];
  const unparsed: string[] = [];

  const segments = text.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  for (const seg of segments) {
    if (tryParseSegment(seg, attributes)) continue;
    unparsed.push(seg);
  }
  return { attributes, unparsed };
}

function tryParseSegment(seg: string, out: RawAttribute[]): boolean {
  // 狀態免疫：流血
  const immunity = seg.match(/^狀態免疫[：:]\s*(\S+)$/);
  if (immunity) {
    const key = STATUS_IMMUNITY[immunity[1]];
    if (key) { out.push({ key, value: true }); return true; }
    return false;
  }
  if (seg === '免疫擊退') { out.push({ key: 'KNOCKBACK_IMMUNITY', value: true }); return true; }

  // <label>: +5% + (1% × 精煉等級)  |  <label>: + (2 × 精煉等級)  |  <label>: +10% | <label>: +100
  const m = seg.match(
    /^(.+?)[：:]\s*([+\-])?\s*(?:\((\d+(?:\.\d+)?)(%?)\s*×\s*精煉等級\)|(\d+(?:\.\d+)?)(%?))\s*(.*)$/,
  );
  if (!m) return false;
  const [, label, signRaw, refVal, refPct, baseVal, basePct, rest] = m;
  const def = STAT_LABELS[label.trim()];
  if (!def) return false;
  const sign = signRaw === '-' ? -1 : 1;

  const pushValue = (num: number, isPercent: boolean, perRefine: boolean): boolean => {
    const key = isPercent ? (def.percent ?? def.flat) : (def.flat ?? def.percent);
    if (!key) return false;
    out.push({ key, value: sign * num, per_refine: perRefine });
    return true;
  };

  let ok = false;
  if (baseVal !== undefined) ok = pushValue(parseFloat(baseVal), basePct === '%', false);
  if (refVal !== undefined) ok = pushValue(parseFloat(refVal), refPct === '%', true) || ok;

  // trailing "+ (1% × 精煉等級)" after a base value
  const tail = rest?.match(/^\+\s*\((\d+(?:\.\d+)?)(%?)\s*×\s*精煉等級\)/);
  if (tail) ok = pushValue(parseFloat(tail[1]), tail[2] === '%', true) || ok;

  return ok;
}
