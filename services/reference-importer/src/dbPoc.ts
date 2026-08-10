/**
 * DB POC: run the real Postgres migration in PGlite (WASM Postgres),
 * load the published catalog + attribute dictionary, and prove the
 * data model supports attribute-based search.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { AttributeDef } from './types.js';
import type { PublishedCatalog } from './pipeline/publish.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

async function main() {
  const db = new PGlite();

  const migration = await readFile(
    join(ROOT, 'infra', 'database', 'migrations', '001_reference.sql'),
    'utf8',
  );
  await db.exec(migration);
  console.log('[db] migration 001_reference.sql applied');

  const dict: AttributeDef[] = JSON.parse(
    await readFile(join(ROOT, 'packages', 'game-schema', 'attributes.json'), 'utf8'),
  ).attributes;
  for (const a of dict) {
    await db.query(
      `INSERT INTO attributes (canonical_key, name_en, name_zh_tw, value_type, searchable, refine_scalable)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [a.canonical_key, a.name_en, a.name_zh_tw ?? null, a.value_type, a.searchable, a.refine_scalable],
    );
  }

  const catalog: PublishedCatalog = JSON.parse(
    await readFile(join(ROOT, 'data', 'published', 'catalog.json'), 'utf8'),
  );

  const version = await db.query<{ id: string }>(
    `INSERT INTO reference_versions (version_tag, source, stats) VALUES ($1,$2,$3) RETURNING id`,
    [catalog.version_tag, catalog.source, JSON.stringify(catalog.stats)],
  );
  const versionId = version.rows[0].id;

  for (const item of catalog.items) {
    const res = await db.query<{ id: string }>(
      `INSERT INTO game_items
         (canonical_key, name_en, name_zh_tw, category, subcategory, equipment_slot,
          rarity, description, source, source_hash, needs_verification)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [item.canonical_key, item.name_en, item.name_zh_tw ?? null, item.category,
       item.subcategory ?? null, item.equipment_slot ?? null, item.rarity ?? null,
       item.description ?? null, item.source, item.source_hash, item.needs_verification],
    );
    const itemId = res.rows[0].id;
    for (const attr of item.attributes) {
      await db.query(
        `INSERT INTO item_base_attributes (item_id, attribute_id, value_num, value_text, per_refine)
         SELECT $1, id, $3, $4, $5 FROM attributes WHERE canonical_key = $2`,
        [itemId, attr.attribute_key, attr.value_num ?? null, attr.value_text ?? null, attr.per_refine],
      );
    }
    await db.query(
      `INSERT INTO reference_changes (version_id, canonical_key, change_type, new_hash, review_status)
       VALUES ($1,$2,'NEW',$3,'AUTO')`,
      [versionId, item.canonical_key, item.source_hash],
    );
  }
  console.log(`[db] inserted ${catalog.items.length} items with attributes`);

  // Attribute search demo: equipment with (VIT >= 10 OR STR >= 5) AND MAX_HP >= 8
  const search = await db.query(
    `SELECT gi.canonical_key, gi.name_en, gi.name_zh_tw
       FROM game_items gi
      WHERE gi.category = 'equipment'
        AND EXISTS (SELECT 1 FROM item_base_attributes iba JOIN attributes a ON a.id = iba.attribute_id
                    WHERE iba.item_id = gi.id AND a.canonical_key IN ('VIT','STR') AND iba.value_num >= 10)
        AND EXISTS (SELECT 1 FROM item_base_attributes iba JOIN attributes a ON a.id = iba.attribute_id
                    WHERE iba.item_id = gi.id AND a.canonical_key = 'MAX_HP' AND iba.value_num >= 8)`,
  );
  console.log('[search] equipment with (VIT>=10) AND MAX_HP>=8%:', search.rows);

  const counts = await db.query(
    `SELECT category, count(*)::int AS n FROM game_items GROUP BY category ORDER BY category`,
  );
  console.log('[db] catalog by category:', counts.rows);

  const changes = await db.query(
    `SELECT count(*)::int AS n FROM reference_changes WHERE version_id = $1`, [versionId],
  );
  console.log(`[db] reference_changes recorded for version ${catalog.version_tag}:`, changes.rows[0]);

  if ((search.rows as unknown[]).length === 0) {
    throw new Error('POC search returned no rows — data model or seed data broken');
  }
  console.log('[db:poc] OK — schema + catalog + attribute search verified');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
