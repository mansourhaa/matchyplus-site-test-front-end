'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { MatchyLogo } from '@/components/matchy/matchy-logo';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { login, selectAuth } from '@/features/auth/store/auth-slice';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LoginForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(selectAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const resultAction = await dispatch(login({ email, password }));
      if (login.fulfilled.match(resultAction)) {
        router.push('/home');
        router.refresh();
      }
    } catch {
      // Error surfaced via auth slice.
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: matchyBrand.bg }}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm"
        style={{ border: `1px solid ${matchyBrand.border}` }}
      >
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <MatchyLogo href="/login" size="md" />
          <p className="text-sm" style={{ color: matchyBrand.muted }}>
            Sign in to continue matching
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-bold text-[#888]">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
              style={{
                background: matchyBrand.bg,
                border: `1px solid ${matchyBrand.borderStrong}`,
                color: matchyBrand.textDark,
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-bold text-[#888]">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
              style={{
                background: matchyBrand.bg,
                border: `1px solid ${matchyBrand.borderStrong}`,
                color: matchyBrand.textDark,
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-60"
            style={{ background: matchyBrand.gradient }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
          </button>
          {error && <p className="text-sm text-[#E24E59]">{error}</p>}
        </form>

        <p className="mt-5 text-center text-sm text-[#888]">
          <Link href="/register" className="font-semibold" style={{ color: matchyBrand.blue }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
