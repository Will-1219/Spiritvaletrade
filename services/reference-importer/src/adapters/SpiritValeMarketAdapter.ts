import { featureFlags } from '../featureFlags.js';
import type { ISourceAdapter, RawItemRecord, SnapshotMeta } from '../types.js';

/**
 * Adapter for spiritvalemarket.com reference data.
 *
 * DISABLED: data-usage permission is unclear (no ToS / license on the site).
 * Blocked on: (1) permission from site owner (Discord: LessFluff),
 * (2) endpoint discovery via a real browser session (site is an SPA serving
 * static data bundles). See docs/DATA_SOURCE_REVIEW.md and
 * docs/REFERENCE_SOURCE_REPORT.md.
 *
 * When enabled, this adapter must: fetch the public static bundle at most once
 * per site version (cache-busting param change), store a raw snapshot with
 * hash + timestamp, never scrape at runtime, and never bypass rate limits or
 * protections.
 */
export class SpiritValeMarketAdapter implements ISourceAdapter {
  readonly sourceName = 'spiritvalemarket';

  async fetch(_versionTag: string): Promise<{ records: RawItemRecord[]; meta: SnapshotMeta }> {
    if (!featureFlags.SPIRITVALEMARKET_BULK_IMPORT) {
      throw new Error(
        'SpiritValeMarketAdapter is disabled by feature flag SPIRITVALEMARKET_BULK_IMPORT. ' +
          'See docs/DATA_SOURCE_REVIEW.md — data usage permission not yet confirmed.',
      );
    }
    throw new Error('Not implemented: pending permission + endpoint discovery.');
  }
}
