import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  type BulkSnapshot, equipmentToRecord, parseCardName, parseGemName, parseTaggedEffects,
} from './bulkParser.js';
import type { ISourceAdapter, RawItemRecord, SnapshotMeta } from '../../types.js';

/**
 * Valepedia (valepedia.com) adapter — bulk import enabled per product decision
 * 2026-08-10 (see docs/DATA_SOURCE_REVIEW.md). Reads a locally saved snapshot
 * (bulk_snapshot.json) collected from public pages/endpoints:
 *   - equipment: /database/equipments/<id>/_payload.json (per game version)
 *   - cards/gems: server-rendered list pages
 *   - stat enum: site's public JS chunk
 * Collection was one-shot, low-rate, no protections bypassed. Runtime never
 * scrapes. Only factual stats + en/zh-TW names are imported — no long
 * descriptions, no images.
 */
export class ValepediaSourceAdapter implements ISourceAdapter {
  readonly sourceName = 'valepedia';
  readonly warnings: string[] = [];

  constructor(private readonly baseDir: string) {}

  async fetch(versionTag: string): Promise<{ records: RawItemRecord[]; meta: SnapshotMeta }> {
    const path = join(this.baseDir, versionTag, 'bulk_snapshot.json');
    const bulk: BulkSnapshot = JSON.parse(await readFile(path, 'utf8'));
    const enumNames = Object.values(bulk.stat_enum).filter((n) => /^[A-Z]/.test(n));
    const records: RawItemRecord[] = [];

    // equipment
    const listById = new Map(bulk.equip_list);
    for (const e of Object.values(bulk.equipments)) {
      records.push(equipmentToRecord(e, listById.get(e.id), this.warnings));
    }

    // cards
    for (const [id, text] of bulk.cards) {
      const [namePart, effectPart = ''] = text.split('|', 2);
      const nm = parseCardName(namePart);
      if (!nm.name_en) {
        // fallback: site row has no EN display name — use the external id
        this.warnings.push(`card name fallback to id: ${namePart} -> ${id}`);
        nm.name_en = /card$/i.test(id) ? id : `${id} Card`;
        nm.name_zh = nm.name_zh ?? (namePart || undefined);
      }
      const fx = parseTaggedEffects(effectPart, enumNames);
      records.push({
        name_en: nm.name_en,
        name_zh_tw: nm.name_zh,
        category: 'card',
        subcategory: nm.slot,
        description: fx.raw.length ? `效果: ${fx.raw.join('；')}` : undefined,
        attributes: fx.attributes,
        source_external_id: id,
        source_url: `https://www.valepedia.com/database/cards/${encodeURIComponent(id)}`,
      });
    }

    // gems
    for (const [id, text] of bulk.gems) {
      const [namePart, effectPart = ''] = text.split('|', 2);
      const nm = parseGemName(namePart);
      if (!nm.name_en) {
        // fallback: site row has no EN display name — use the external id
        this.warnings.push(`gem name fallback to id: ${namePart} -> ${id}`);
        nm.name_en = /gem$/i.test(id) ? id : `${id} Gem`;
        nm.name_zh = nm.name_zh ?? (namePart || undefined);
      }
      const fx = parseTaggedEffects(effectPart, enumNames);
      records.push({
        name_en: nm.name_en,
        name_zh_tw: nm.name_zh,
        category: 'gem',
        description: fx.raw.length ? `效果: ${fx.raw.join('；')}` : undefined,
        attributes: fx.attributes,
        source_external_id: id,
        source_url: `https://www.valepedia.com/database/gems/${encodeURIComponent(id)}`,
      });
    }

    // duplicate display-name guard: disambiguate with external id
    const seen = new Map<string, number>();
    for (const r of records) {
      const k = `${r.category}:${r.name_en.toLowerCase()}`;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    for (const r of records) {
      const k = `${r.category}:${r.name_en.toLowerCase()}`;
      if ((seen.get(k) ?? 0) > 1 && r.source_external_id && r.source_external_id !== r.name_en) {
        this.warnings.push(`duplicate display name "${r.name_en}" — disambiguated with id "${r.source_external_id}"`);
        r.name_en = `${r.name_en} (${r.source_external_id})`;
      }
    }

    return {
      records,
      meta: {
        source: this.sourceName,
        version_tag: `${versionTag}+game-${bulk.game_version}`,
        fetched_at: bulk.fetched_at,
        record_count: records.length,
        files: ['bulk_snapshot.json'],
      },
    };
  }
}
