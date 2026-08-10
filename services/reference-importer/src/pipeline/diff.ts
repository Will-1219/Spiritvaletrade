import type { CanonicalItem, DiffEntry, ImportDiff } from '../types.js';

/**
 * Diff incoming catalog vs currently published catalog.
 * Added / Changed / Removed / Unknown:
 *  - UNKNOWN: same canonical_key but category changed — likely a key collision or
 *    a source rename; must never auto-publish, review required.
 */
export function diffCatalogs(current: CanonicalItem[], incoming: CanonicalItem[]): ImportDiff {
  const curByKey = new Map(current.map((i) => [i.canonical_key, i]));
  const incByKey = new Map(incoming.map((i) => [i.canonical_key, i]));
  const diff: ImportDiff = { added: [], changed: [], removed: [], unknown: [] };

  for (const [key, inc] of incByKey) {
    const cur = curByKey.get(key);
    if (!cur) {
      diff.added.push({ canonical_key: key, change_type: 'NEW', new_hash: inc.source_hash, new: inc });
    } else if (cur.category !== inc.category) {
      diff.unknown.push({
        canonical_key: key, change_type: 'UNKNOWN',
        old_hash: cur.source_hash, new_hash: inc.source_hash, old: cur, new: inc,
      });
    } else if (cur.source_hash !== inc.source_hash) {
      diff.changed.push({
        canonical_key: key, change_type: 'UPDATED',
        old_hash: cur.source_hash, new_hash: inc.source_hash, old: cur, new: inc,
      });
    }
  }
  for (const [key, cur] of curByKey) {
    if (!incByKey.has(key)) {
      diff.removed.push({ canonical_key: key, change_type: 'REMOVED', old_hash: cur.source_hash, old: cur });
    }
  }
  return diff;
}

/** Changes that may be applied without human review: only brand-new records. */
export function requiresReview(diff: ImportDiff): boolean {
  return diff.changed.length > 0 || diff.removed.length > 0 || diff.unknown.length > 0;
}
