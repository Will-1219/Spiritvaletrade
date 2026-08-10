import type { Metadata } from 'next';
import Link from 'next/link';
import { getLang } from '@/lib/i18n';
import LangToggle from '@/components/LangToggle';
import './globals.css';

export const metadata: Metadata = {
  title: 'ValeTrade 靈谷交易所 — SpiritVale Trading Companion',
  description:
    'SpiritVale 玩家物品交易平台：進階屬性搜尋、即時刊登、價格追蹤。Search SpiritVale items by any attribute.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang === 'zh' ? 'zh-Hant' : 'en'}>
      <body className="min-h-screen">
        <header className="border-b border-line bg-panel/60 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-6">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-accent">ValeTrade</span>
              <span className="text-xs text-dim">靈谷交易所</span>
            </Link>
            <nav className="flex gap-4 text-sm text-dim">
              <Link href="/database" className="hover:text-slate-200">
                {lang === 'zh' ? '物品資料庫' : 'Database'}
              </Link>
              <Link href="/market" className="hover:text-slate-200">
                {lang === 'zh' ? '市集' : 'Market'}
              </Link>
              <Link href="/market/new" className="hover:text-slate-200">
                {lang === 'zh' ? '刊登' : 'Sell'}
              </Link>
            </nav>
            <div className="ml-auto">
              <LangToggle lang={lang} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-line mt-16">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-dim leading-relaxed">
            ValeTrade 是非官方粉絲工具，與 SpiritVale 開發團隊無關。遊戲資料版權屬原權利人；
            中文名詞對照採用社群「SpiritZh 繁中翻譯補丁 v3.64.3」。
            交易在遊戲內完成，本站不經手任何款項。
          </div>
        </footer>
      </body>
    </html>
  );
}
