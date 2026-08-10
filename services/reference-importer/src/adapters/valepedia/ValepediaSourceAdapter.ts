import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { decodePayload } from './devalue.js';
import { parseEffectText } from './effectParser.js';
import type { ISourceAdapter, RawAttribute, RawItemRecord, SnapshotMeta } from '../../types.js';

/**
 * Valepedia (valepedia.com) adapter — SMALL-SAMPLE POC.
 *
 * Reads from local snapshot files under data/reference/valepedia/<versionTag>/:
 *   - gems.json / cards.json  (extracted from server-rendered list pages)
 *   - equipments_payload/*.payload.json  (public Nuxt _payload.json endpoints)
 *
 * Live fetching is intentionally NOT wired to the pipeline yet: snapshots are
 * collected manually/assisted at low volume. A polite bulk fetcher (1 req/s,
 * once per game version from /versions/index.json) can be added after the
 * usage decision in docs/DATA_SOURCE_REVIEW.md.
 *
 * Copyright caution: multi-language descriptions are game content — we keep
 * only names (en/zh-TW), factual stats, and slot/socket data.
 */

/** Partial stat-type enum mapping observed from equipment payloads (see snapshot_meta.json). */
const STAT_TYPE_MAP: Record<number, { key: string; percent?: boolean }> = {
  7: { key: 'MAX_HP_FLAT' },       // HP +100
  9: { key: 'ATK' },               // Attack +20 (+2×refine)
  63: { key: 'ATTACK_SPEED', percent: true },  // Attack Speed -10%
  71: { key: 'MAX_HP', percent: true },        // HP +10%
  85: { key: 'BLOCK', percent: true },         // Block +10%
};

const ELEMENT_MAP: Record<number, string> = { 0: 'neutral' };

const SLOT_ZH_TO_EN: Record<string, string> = {
  武器: 'weapon', 胸甲: 'chest', 頭飾: 'headgear', 鞋子: 'boots', 盾牌: 'shield', 飾品: 'accessory',
};

interface EquipPayloadStat {
  type: number; value?: number | null; valueLv?: number | null; valueStr?: string | null; chance?: number | null;
}

export class ValepediaSourceAdapter implements ISourceAdapter {
  readonly sourceName = 'valepedia';
  readonly warnings: string[] = [];

  constructor(private readonly baseDir: string) {}

  async fetch(versionTag: string): Promise<{ records: RawItemRecord[]; meta: SnapshotMeta }> {
    const dir = join(this.baseDir, versionTag);
    const records: RawItemRecord[] = [];
    const files: string[] = [];

    // gems
    const gems = JSON.parse(await readFile(join(dir, 'gems.json'), 'utf8'));
    files.push('gems.json');
    for (const g of gems.records) {
      const { attributes, unparsed } = parseEffectText(g.effects ?? '');
      records.push({
        name_en: g.english_name,
        name_zh_tw: g.chinese_name,
        category: 'gem',
        description: unparsed.length ? `效果: ${unparsed.join('；')}` : undefined,
        attributes,
        source_url: `${gems.list_url}/${encodeURIComponent(g.english_name)}`,
      });
    }

    // cards
    const cards = JSON.parse(await readFile(join(dir, 'cards.json'), 'utf8'));
    files.push('cards.json');
    for (const c of cards.records) {
      const { attributes, unparsed } = parseEffectText(c.effect ?? '');
      records.push({
        name_en: c.english_name,
        name_zh_tw: c.chinese_name,
        category: 'card',
        subcategory: SLOT_ZH_TO_EN[c.slot] ?? c.slot,
        description: unparsed.length ? `效果: ${unparsed.join('；')}` : undefined,
        attributes,
        source_url: `${cards.list_url}/${encodeURIComponent(c.english_name.replace(/ Card$/, ''))}`,
      });
    }

    // equipment payloads
    const payloadDir = join(dir, 'equipments_payload');
    let payloadFiles: string[] = [];
    try {
      payloadFiles = (await readdir(payloadDir)).filter((f) => f.endsWith('.payload.json'));
    } catch { /* optional */ }
    for (const pf of payloadFiles) {
      files.push(`equipments_payload/${pf}`);
      const raw = await readFile(join(payloadDir, pf), 'utf8');
      const rec = this.parseEquipmentPayload(raw);
      if (rec) records.push(rec);
    }

    return {
      records,
      meta: {
        source: this.sourceName,
        version_tag: versionTag,
        fetched_at: new Date().toISOString(),
        record_count: records.length,
        files,
      },
    };
  }

  private parseEquipmentPayload(raw: string): RawItemRecord | null {
    const root = decodePayload(raw) as { data?: Record<string, unknown> };
    const data = root?.data ?? {};
    const schemaKey = Object.keys(data).find((k) => k === 'equipment-schema');
    const tupleKey = Object.keys(data).find((k) => k.startsWith('equipment-tuple-'));
    if (!schemaKey || !tupleKey) {
      this.warnings.push(`payload missing schema/tuple keys`);
      return null;
    }
    const schema = data[schemaKey] as string[];
    const tuple = data[tupleKey] as unknown[];
    const obj: Record<string, unknown> = {};
    schema.forEach((field, i) => { obj[field] = tuple[i]; });

    const names = (obj.names ?? {}) as Record<string, string>;
    const nameEn = names.en || (obj.id as string);
    const attributes: RawAttribute[] = [];

    for (const group of ['primaryStats', 'secondaryStats'] as const) {
      const stats = (obj[group] ?? []) as EquipPayloadStat[];
      for (const s of stats) {
        const mapped = STAT_TYPE_MAP[s.type];
        if (!mapped) {
          this.warnings.push(`${nameEn}: unmapped stat type ${s.type} (value=${s.value})`);
          continue;
        }
        if (typeof s.value === 'number' && s.value !== 0) {
          attributes.push({ key: mapped.key, value: s.value });
        }
        if (typeof s.valueLv === 'number' && s.valueLv !== 0) {
          attributes.push({ key: mapped.key, value: s.valueLv, per_refine: true });
        }
      }
    }
    if (typeof obj.slots === 'number' && obj.slots > 0) {
      attributes.push({ key: 'SOCKETS', value: obj.slots });
    }
    if (typeof obj.levelRequired === 'number' && obj.levelRequired > 0) {
      attributes.push({ key: 'REQUIRED_LEVEL', value: obj.levelRequired });
    }

    return {
      name_en: nameEn,
      name_zh_tw: names.zhtw || undefined,
      category: 'equipment',
      subcategory: typeof obj.type === 'string' ? (obj.type as string).toLowerCase() : undefined,
      equipment_slot: 'weapon', // POC: Broad Sword sample; real slot needs type→slot mapping table
      description: [
        typeof obj.element === 'number' ? `element: ${ELEMENT_MAP[obj.element as number] ?? obj.element}` : null,
        obj.unique ? 'unique' : null,
      ].filter(Boolean).join('; ') || undefined,
      attributes,
      source_external_id: obj.id as string,
      source_url: `https://www.valepedia.com/database/equipments/${encodeURIComponent(obj.id as string)}`,
    };
  }
}
