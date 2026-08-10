'use client';

import { useRouter } from 'next/navigation';

export default function LangToggle({ lang }: { lang: 'zh' | 'en' }) {
  const router = useRouter();
  const next = lang === 'zh' ? 'en' : 'zh';
  return (
    <button
      className="chip hover:border-accent cursor-pointer"
      title={next === 'en' ? 'Switch to English' : '切換為中文'}
      onClick={() => {
        document.cookie = `vt_lang=${next};path=/;max-age=31536000`;
        router.refresh();
      }}
    >
      {lang === 'zh' ? '中 → EN' : 'EN → 中'}
    </button>
  );
}
