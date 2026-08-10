import type { AttributeDef, CanonicalItem, ValidationIssue } from '../types.js';

const KEY_RE = /^(ITEM|CARD|GEM|ARTIFACT|MATERIAL|CONSUMABLE)_[A-Z0-9_]+$/;
const CATEGORIES = new Set(['equipment', 'card', 'gem', 'artifact', 'material', 'consumable']);

export function validateCatalog(
  items: CanonicalItem[],
  attributeDefs: AttributeDef[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const attrByKey = new Map(attributeDefs.map((a) => [a.canonical_key, a]));
  const seen = new Map<string, number>();

  for (const item of items) {
    const key = item.canonical_key;
    seen.set(key, (seen.get(key) ?? 0) + 1);

    if (!KEY_RE.test(key)) {
      issues.push({ canonical_key: key, severity: 'error', message: `invalid canonical_key format` });
    }
    if (!item.name_en) {
      issues.push({ canonical_key: key, severity: 'error', message: 'missing name_en' });
    }
    if (!CATEGORIES.has(item.category)) {
      issues.push({ canonical_key: key, severity: 'error', message: `invalid category "${item.category}"` });
    }
    if (item.category === 'equipment' && !item.equipment_slot) {
      issues.push({ canonical_key: key, severity: 'warning', message: 'equipment without equipment_slot' });
    }

    for (const attr of item.attributes) {
      const def = attrByKey.get(attr.attribute_key);
      if (!def) {
        issues.push({
          canonical_key: key, severity: 'error',
          message: `attribute "${attr.attribute_key}" not in attribute dictionary`,
        });
        continue;
      }
      const isNumeric = def.value_type === 'flat' || def.value_type === 'percent';
      if (isNumeric && attr.value_num === undefined) {
        issues.push({
          canonical_key: key, severity: 'error',
          message: `attribute ${attr.attribute_key} (${def.value_type}) requires numeric value`,
        });
      }
      if (def.value_type === 'boolean' && !['true', 'false'].includes(attr.value_text ?? '')) {
        issues.push({
          canonical_key: key, severity: 'error',
          message: `attribute ${attr.attribute_key} (boolean) requires true/false`,
        });
      }
      if (attr.per_refine && !def.refine_scalable) {
        issues.push({
          canonical_key: key, severity: 'warning',
          message: `attribute ${attr.attribute_key} marked per_refine but dictionary says not refine_scalable`,
        });
      }
    }
  }

  for (const [key, count] of seen) {
    if (count > 1) {
      issues.push({ canonical_key: key, severity: 'error', message: `duplicate canonical_key (${count}x)` });
    }
  }
  return issues;
}
