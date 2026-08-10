import { getLang } from '@/lib/i18n';
import ManageForm from './ManageForm';

export const dynamic = 'force-dynamic';

export default async function Manage() {
  const lang = await getLang();
  return <ManageForm lang={lang} />;
}
