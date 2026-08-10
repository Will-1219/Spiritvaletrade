import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { ISourceAdapter, RawItemRecord, SnapshotMeta } from '../types.js';

/**
 * Reads internally-authored seed files from data/reference/manual/<versionTag>/*.json.
 * Seed data is placeholder content for schema validation — needs_verification stays true.
 */
export class ManualSourceAdapter implements ISourceAdapter {
  readonly sourceName = 'manual';

  constructor(private readonly baseDir: string) {}

  async fetch(versionTag: string): Promise<{ records: RawItemRecord[]; meta: SnapshotMeta }> {
    const dir = join(this.baseDir, versionTag);
    const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
    const records: RawItemRecord[] = [];
    for (const file of files) {
      const parsed = JSON.parse(await readFile(join(dir, file), 'utf8'));
      if (!Array.isArray(parsed.records)) {
        throw new Error(`${file}: expected { records: [...] }`);
      }
      records.push(...parsed.records);
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
}
