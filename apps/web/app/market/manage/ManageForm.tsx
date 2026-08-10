'use client';

import { useActionState } from 'react';
import { manageListing, type ManageResult } from '../actions';

export default function ManageForm({ lang }: { lang: 'zh' | 'en' }) {
  const [state, action, pending] = useActionState<ManageResult, FormData>(manageListing, {});
  const zh = lang === 'zh';
  return (
    <form action={action} className="panel p-6 space-y-4 max-w-md mx-auto">
      <h1 className="text-lg font-bold">{zh ? '管理我的刊登' : 'Manage my listing'}</h1>
      <p className="text-sm text-dim">
        {zh ? '輸入刊登時取得的管理碼:' : 'Enter the manage code you received when listing:'}
      </p>
      <input name="token" className="input w-full" required placeholder="a1b2c3…" />
      {state.error && <div className="text-sm text-red-600">{state.error}</div>}
      {state.ok && <div className="text-sm text-accent">{state.ok}</div>}
      <div className="flex gap-3">
        <button className="btn flex-1" name="action" value="SOLD" disabled={pending}>
          {zh ? '標記已售出' : 'Mark sold'}
        </button>
        <button
          className="btn-ghost flex-1 !text-red-600 hover:!border-red-500"
          name="action" value="CANCELLED" disabled={pending}
        >
          {zh ? '取消刊登' : 'Cancel listing'}
        </button>
      </div>
    </form>
  );
}
