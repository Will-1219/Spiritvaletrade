/**
 * Minimal decoder for Nuxt _payload.json (devalue "unflatten" format):
 * the payload is a JSON array; element 0 is the root; numbers inside objects/
 * arrays are indices into the same top-level array. Special forms like
 * ["ShallowReactive", i] wrap an inner index.
 */
export function decodePayload(raw: string): unknown {
  const arr = JSON.parse(raw) as unknown[];
  const cache = new Map<number, unknown>();

  function hydrate(index: number): unknown {
    if (index < 0) return undefined; // -1 = undefined marker
    if (cache.has(index)) return cache.get(index);
    const value = arr[index];

    if (Array.isArray(value)) {
      // wrapper form: ["ShallowReactive", idx] / ["Reactive", idx] / ["Ref", idx]
      if (value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'number'
          && ['ShallowReactive', 'Reactive', 'Ref', 'ShallowRef'].includes(value[0] as string)) {
        const inner = hydrate(value[1] as number);
        cache.set(index, inner);
        return inner;
      }
      const out: unknown[] = [];
      cache.set(index, out);
      for (const v of value) {
        out.push(typeof v === 'number' ? hydrate(v) : v);
      }
      return out;
    }
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      cache.set(index, out);
      for (const [k, v] of Object.entries(value)) {
        out[k] = typeof v === 'number' ? hydrate(v) : v;
      }
      return out;
    }
    cache.set(index, value);
    return value;
  }

  return hydrate(0);
}
