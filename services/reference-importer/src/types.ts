export type Category = 'equipment' | 'card' | 'gem' | 'artifact' | 'material' | 'consumable';

export interface RawAttribute {
  key: string;
  value: number | boolean | string;
  per_refine?: boolean;
}

/** Record as produced by a source adapter's parse stage. */
export interface RawItemRecord {
  name_en: string;
  name_zh_tw?: string;
  category: string;
  subcategory?: string;
  equipment_slot?: string;
  rarity?: string;
  description?: string;
  attributes?: RawAttribute[];
  source_external_id?: string;
  source_url?: string;
}

export interface CanonicalAttributeValue {
  attribute_key: string;
  value_num?: number;
  value_text?: string;
  per_refine: boolean;
}

export interface CanonicalItem {
  canonical_key: string;
  name_en: string;
  name_zh_tw?: string;
  category: Category;
  subcategory?: string;
  equipment_slot?: string;
  rarity?: string;
  description?: string;
  source: string;
  source_external_id?: string;
  source_url?: string;
  source_hash: string;
  needs_verification: boolean;
  attributes: CanonicalAttributeValue[];
}

export interface AttributeDef {
  canonical_key: string;
  name_en: string;
  name_zh_tw?: string;
  value_type: 'flat' | 'percent' | 'boolean' | 'enum' | 'text';
  searchable: boolean;
  refine_scalable: boolean;
}

export interface ValidationIssue {
  canonical_key: string;
  severity: 'error' | 'warning';
  message: string;
}

export type ChangeType = 'NEW' | 'UPDATED' | 'REMOVED' | 'UNKNOWN';

export interface DiffEntry {
  canonical_key: string;
  change_type: ChangeType;
  old_hash?: string;
  new_hash?: string;
  old?: CanonicalItem;
  new?: CanonicalItem;
}

export interface ImportDiff {
  added: DiffEntry[];
  changed: DiffEntry[];
  removed: DiffEntry[];
  unknown: DiffEntry[];
}

export interface SnapshotMeta {
  source: string;
  version_tag: string;
  fetched_at: string;
  record_count: number;
  files: string[];
}

export interface ISourceAdapter {
  readonly sourceName: string;
  /** fetch + parse: returns raw records plus snapshot metadata. */
  fetch(versionTag: string): Promise<{ records: RawItemRecord[]; meta: SnapshotMeta }>;
}
