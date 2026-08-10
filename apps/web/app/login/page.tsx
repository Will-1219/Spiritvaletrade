import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { getLang } from '@/lib/i18n';
import AuthTabs from './AuthTabs';

export const dynamic = 'force-dynamic';

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getUser();
  if (user) redirect(next && next.startsWith('/') ? next : '/account');
  const lang = await getLang();
  return <AuthTabs next={next ?? '/account'} lang={lang} />;
}
