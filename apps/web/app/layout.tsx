import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ValeTrade 靈谷交易所 — SpiritVale Trading Companion',
  description:
    'SpiritVale 玩家物品交易平台：進階屬性搜尋、即時刊登、價格追蹤。Search SpiritVale items by any attribute.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen">
        <header className="border-b border-line bg-panel/60 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-6">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-accent">ValeTrade</span>
              <span className="text-xs text-dim">靈谷交易所</span>
            </Link>
            <nav className="flex gap-4 text-sm text-dim">
              <Link href="/database" className="hover:text-slate-200">物品資料庫</Link>
              <span className="cursor-not-allowed opacity-50" title="即將推出">市集刊登（即將推出）</span>
              <span className="cursor-not-allowed opacity-50" title="即將推出">WTB 收購（即將推出）</span>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-line mt-16">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-dim leading-relaxed">
            ValeTrade 是非官方粉絲工具，與 SpiritVale 開發團隊無關。遊戲資料版權屬原權利人。
            參考資料整理自公開遊戲資訊（game v0.30.10）；交易在遊戲內完成，本站不經手任何款項。
          </div>
        </footer>
      </body>
    </html>
  );
}
