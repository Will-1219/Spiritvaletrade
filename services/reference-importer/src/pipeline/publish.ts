import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { CanonicalItem, ImportDiff, SnapshotMeta } from '../types.js';

export interface PublishedCatalog {
  version_tag: string;
  source: string;
  published_at: string;
  stats: { added: number; changed: number; removed: number; unknown: number; total: number };
  items: CanonicalItem[];
}

export async function loadPublishedCatalog(path: string): Promise<PublishedCatalog | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Apply diff to current catalog and write the new published catalog + version record.
 * Caller is responsible for gating on requiresReview() — in POC we pass
 * `approved: true` explicitly to simulate admin approval.
 */
export async function publishCatalog(opts: {
  path: string;
  versionPath: string;
  current: CanonicalItem[];
  diff: ImportDiff;
  meta: SnapshotMeta;
  approved: boolean;
}): Promise<PublishedCatalog> {
  const { path, versionPath, current, diff, meta, approved } = opts;
  if (!approved && (diff.changed.length || diff.removed.length || diff.unknown.length)) {
    throw new Error('Refusing to publish: UPDATED/REMOVED/UNKNOWN changes require admin review.');
  }
  const byKey = new Map(current.map((i) => [i.canonical_key, i]));
  for (const e of diff.added) byKey.set(e.canonical_key, e.new!);
  for (const e of diff.changed) byKey.set(e.canonical_key, e.new!);
  for (const e of diff.removed) byKey.delete(e.canonical_key);
  // UNKNOWN entries are never auto-applied.

  const items = [...byKey.values()].sort((a, b) => a.canonical_key.localeCompare(b.canonical_key));
  const catalog: PublishedCatalog = {
    version_tag: meta.version_tag,
    source: meta.source,
    published_at: new Date().toISOString(),
    stats: {
      added: diff.added.length,
      changed: diff.changed.length,
      removed: diff.removed.length,
      unknown: diff.unknown.length,
      total: items.length,
    },
    items,
  };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(catalog, null, 2));

  // Historical record: full diff payload per version (Echo-Gem rule — no silent overwrite).
  await mkdir(dirname(versionPath), { recursive: true });
  await writeFile(versionPath, JSON.stringify({ meta, diff }, null, 2));
  return catalog;
}
