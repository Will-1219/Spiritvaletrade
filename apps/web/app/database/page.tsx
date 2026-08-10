import { getLang } from '@/lib/i18n';
import LiveDatabase from '@/components/LiveDatabase';

export const dynamic = 'force-dynamic';

export default async function Database({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const lang = await getLang();
  const { q } = await searchParams;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{lang === 'zh' ? '物品資料庫' : 'Item Database'}</h1>
      <LiveDatabase lang={lang} initialQ={q} />
    </div>
  );
}
