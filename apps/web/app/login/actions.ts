'use server';

import { redirect } from 'next/navigation';
import { getAuthClient } from '@/lib/auth';

export interface AuthResult {
  error?: string;
}

function safeNext(n: unknown): string {
  const s = String(n ?? '');
  return s.startsWith('/') && !s.startsWith('//') ? s : '/account';
}

export async function signUp(_prev: AuthResult, form: FormData): Promise<AuthResult> {
  const c = await getAuthClient();
  if (!c) return { error: '帳號系統尚未設定(缺 SUPABASE_ANON_KEY)' };
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email.includes('@')) return { error: '請輸入有效 email' };
  if (password.length < 8) return { error: '密碼至少 8 個字元' };
  const { error } = await c.auth.signUp({ email, password });
  if (error) return { error: error.message };
  // if email confirmation is disabled, session is set — sign in to be sure
  const { error: e2 } = await c.auth.signInWithPassword({ email, password });
  if (e2) return { error: '註冊成功,請直接登入' };
  redirect(safeNext(form.get('next')));
}

export async function signIn(_prev: AuthResult, form: FormData): Promise<AuthResult> {
  const c = await getAuthClient();
  if (!c) return { error: '帳號系統尚未設定(缺 SUPABASE_ANON_KEY)' };
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) return { error: 'email 或密碼錯誤' };
  redirect(safeNext(form.get('next')));
}

export async function signOut() {
  const c = await getAuthClient();
  await c?.auth.signOut();
  redirect('/');
}
