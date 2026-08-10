import { getCatalog } from '@/lib/catalog';
import { getLang } from '@/lib/i18n';
import { getDb } from '@/lib/db';
import NewListingForm from './NewListingForm';

export const dynamic = 'force-dynamic';

export default async function NewListing({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const lang = await getLang();
  const { item } = await searchParams;
  if (!getDb()) {
    return (
      <div className="panel p-6 max-w-xl mx-auto text-sm text-dim">
        市集尚未啟用(資料庫連線未設定)。
      </div>
    );
  }
  const items = getCatalog().items.map((i) => ({
    key: i.canonical_key,
    en: i.name_en,
    zh: i.name_zh_tw,
  }));
  return <NewListingForm items={items} prefKey={item} lang={lang} />;
}
