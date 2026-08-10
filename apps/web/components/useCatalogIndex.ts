'use client';

import { useEffect, useState } from 'react';

export interface IndexItem {
  k: string; en: string; zh: string | null; cn: string | null;
  c: string; s: string | null;
  a: [string, number, number][];
}

let cache: IndexItem[] | null = null;
let inflight: Promise<IndexItem[]> | null = null;

async function load(): Promise<IndexItem[]> {
  if (cache) return cache;
  inflight ??= fetch('/api/catalog')
    .then((r) => r.json())
    .then((j) => (cache = j.items as IndexItem[]));
  return inflight;
}

export function useCatalogIndex(): IndexItem[] | null {
  const [items, setItems] = useState<IndexItem[] | null>(cache);
  useEffect(() => {
    if (!cache) load().then(setItems);
  }, []);
  return items;
}

/** Instant match: substring on EN (case-insensitive) / zh-TW / zh-CN. */
export function matchItem(it: IndexItem, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    it.en.toLowerCase().includes(lower) ||
    (it.zh ?? '').includes(q) ||
    (it.cn ?? '').includes(q)
  );
}

export function itemLabel(it: IndexItem, lang: 'zh' | 'en'): string {
  return lang === 'en' ? it.en : (it.zh ?? it.en);
}
