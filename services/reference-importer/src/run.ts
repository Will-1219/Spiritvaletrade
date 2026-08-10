import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { ManualSourceAdapter } from './adapters/ManualSourceAdapter.js';
import { SpiritValeMarketAdapter } from './adapters/SpiritValeMarketAdapter.js';
import { canonicalize } from './pipeline/canonicalize.js';
import { validateCatalog } from './pipeline/validate.js';
import { diffCatalogs, requiresReview } from './pipeline/diff.js';
import { loadPublishedCatalog, publishCatalog } from './pipeline/publish.js';
import type { AttributeDef, ISourceAdapter } from './types.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

async function main() {
  const args = process.argv.slice(2);
  const source = argValue(args, '--source') ?? 'manual';
  const versionTag = argValue(args, '--version') ?? new Date().toISOString().slice(0, 10);

  const adapter: ISourceAdapter =
    source === 'manual'
      ? new ManualSourceAdapter(join(ROOT, 'data', 'reference', 'manual'))
      : new SpiritValeMarketAdapter();

  console.log(`[import] source=${adapter.sourceName} version=${versionTag}`);

  // 1-2. fetch + parse (adapter)
  const { records, meta } = await adapter.fetch(versionTag);
  console.log(`[fetch] ${records.length} raw records from ${meta.files?.join(', ')}`);

  // 3. canonicalize
  const canonical = records.map((r) => canonicalize(r, adapter.sourceName));

  // 4. validate
  const dict: AttributeDef[] = JSON.parse(
    await readFile(join(ROOT, 'packages', 'game-schema', 'attributes.json'), 'utf8'),
  ).attributes;
  const issues = validateCatalog(canonical, dict);
  const errors = issues.filter((i) => i.severity === 'error');
  for (const i of issues) console.log(`[validate:${i.severity}] ${i.canonical_key}: ${i.message}`);
  if (errors.length) {
    console.error(`[validate] ${errors.length} error(s) — aborting before diff/publish.`);
    process.exit(1);
  }

  // 5. diff vs published
  const catalogPath = join(ROOT, 'data', 'published', 'catalog.json');
  const versionPath = join(ROOT, 'data', 'published', 'versions', `${versionTag}.json`);
  const published = await loadPublishedCatalog(catalogPath);
  const diff = diffCatalogs(published?.items ?? [], canonical);
  console.log(
    `[diff] added=${diff.added.length} changed=${diff.changed.length} ` +
      `removed=${diff.removed.length} unknown=${diff.unknown.length}`,
  );

  // 6. review gate
  const needsReview = requiresReview(diff);
  const approved = !needsReview || args.includes('--approve');
  if (needsReview && !approved) {
    console.error('[review] UPDATED/REMOVED/UNKNOWN present — re-run with --approve after admin review.');
    process.exit(2);
  }

  // 7. publish
  const catalog = await publishCatalog({
    path: catalogPath, versionPath,
    current: published?.items ?? [], diff, meta, approved,
  });
  console.log(`[publish] ${catalog.stats.total} items → data/published/catalog.json (version ${versionTag})`);
}

function argValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
