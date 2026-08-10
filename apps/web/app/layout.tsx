import type { Metadata } from 'next';
import Link from 'next/link';
import { getLang } from '@/lib/i18n';
import { getUser } from '@/lib/auth';
import LangToggle from '@/components/LangToggle';
import './globals.css';

export const metadata: Metadata = {
  title: 'ValeTrade 靈谷交易所 — SpiritVale 玩家市集',
  description:
    'SpiritVale 玩家物品交易平台：即時搜尋、玩家刊登、出價成交。Search SpiritVale items by any attribute.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const user = await getUser();
  const zh = lang === 'zh';
  return (
    <html lang={zh ? 'zh-Hant' : 'en'}>
      <body className="min-h-screen flex flex-col">
        <header className="bg-panel/90 backdrop-blur border-b border-line sticky top-0 z-30">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="grid place-items-center h-8 w-8 rounded-lg bg-accent text-white font-display font-bold text-lg shadow-card group-hover:shadow-lift transition-shadow">谷</span>
              <span className="leading-none">
                <span className="block font-display font-bold text-[17px] tracking-tight">ValeTrade</span>
                <span className="block text-[10px] text-dim tracking-[0.18em]">靈谷交易所</span>
              </span>
            </Link>
            <nav className="flex gap-5 text-sm text-dim font-medium">
              <Link href="/database" className="hover:text-accent transition-colors">{zh ? '物品圖鑑' : 'Database'}</Link>
              <Link href="/market" className="hover:text-accent transition-colors">{zh ? '市集' : 'Market'}</Link>
              <Link href="/market/new" className="hover:text-accent transition-colors">{zh ? '我要賣' : 'Sell'}</Link>
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <LangToggle lang={lang} />
              {user ? (
                <Link href="/account" className="btn-ghost !py-1.5 !px-3 text-xs">{zh ? '我的帳號' : 'Account'}</Link>
              ) : (
                <Link href="/login" className="btn !py-1.5 !px-3 text-xs">{zh ? '登入 / 註冊' : 'Sign in'}</Link>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 flex-1">{children}</main>
        <footer className="border-t border-line bg-panel">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-dim leading-relaxed">
            ValeTrade 是非官方玩家工具，與 SpiritVale 開發團隊無關。遊戲資料版權屬原權利人；
            中文名詞對照採用社群「SpiritZh 繁中翻譯」。交易在遊戲內完成，本站不經手任何款項。
          </div>
        </footer>
      </body>
    </html>
  );
}
