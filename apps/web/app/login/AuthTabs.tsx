'use client';

import { useState, useActionState } from 'react';
import { signIn, signUp, type AuthResult } from './actions';

export default function AuthTabs({ next, lang }: { next: string; lang: 'zh' | 'en' }) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [inState, inAction, inPending] = useActionState<AuthResult, FormData>(signIn, {});
  const [upState, upAction, upPending] = useActionState<AuthResult, FormData>(signUp, {});
  const zh = lang === 'zh';
  const state = mode === 'in' ? inState : upState;
  const pending = mode === 'in' ? inPending : upPending;

  return (
    <div className="panel p-6 max-w-sm mx-auto space-y-4">
      <div className="flex gap-2">
        <button
          className={`flex-1 py-2 rounded-lg text-sm border ${mode === 'in' ? 'border-accent text-accent bg-accent/10' : 'border-line text-dim'}`}
          onClick={() => setMode('in')}
        >
          {zh ? '登入' : 'Sign in'}
        </button>
        <button
          className={`flex-1 py-2 rounded-lg text-sm border ${mode === 'up' ? 'border-accent text-accent bg-accent/10' : 'border-line text-dim'}`}
          onClick={() => setMode('up')}
        >
          {zh ? '註冊' : 'Sign up'}
        </button>
      </div>

      <form action={mode === 'in' ? inAction : upAction} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <label className="block text-sm">
          <span className="text-dim">Email</span>
          <input name="email" type="email" required className="input w-full mt-1" autoComplete="email" />
        </label>
        <label className="block text-sm">
          <span className="text-dim">{zh ? '密碼(至少 8 字元)' : 'Password (min 8 chars)'}</span>
          <input name="password" type="password" required minLength={8} className="input w-full mt-1"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
        </label>
        {state.error && <div className="text-sm text-red-600">{state.error}</div>}
        <button className="btn w-full" disabled={pending} type="submit">
          {pending ? '…' : mode === 'in' ? (zh ? '登入' : 'Sign in') : (zh ? '建立帳號' : 'Create account')}
        </button>
      </form>
      <p className="text-xs text-dim">
        {zh
          ? '帳號用於管理你的刊登與出價。聯絡方式(遊戲ID/LINE/微信/Discord)在「我的帳號」設定,只在成交後顯示給對方。'
          : 'Accounts manage your listings and offers. Contact info is only revealed to the other party after a deal.'}
      </p>
    </div>
  );
}
