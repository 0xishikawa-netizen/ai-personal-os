'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getIsLoggedIn, setLoggedIn } from './dashboard/DashboardShell';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (getIsLoggedIn()) {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoggedIn(true);
    router.replace('/dashboard');
  };

  return (
    <main className="min-h-screen min-h-[100dvh] flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] text-[#0a0c0e] shadow-xl shadow-[var(--accent-glow)] mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-[1.65rem] font-semibold tracking-tight text-[var(--foreground)]">
            Kairos
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
            ログインしてダッシュボードとチャットを利用します
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]/80 backdrop-blur-xl p-8 shadow-[var(--card-shadow)]">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)]/60 px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)]/70 outline-none transition-shadow focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent-glow)]"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)]/60 px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)]/70 outline-none transition-shadow focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent-glow)]"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-soft)] py-3.5 text-sm font-semibold text-[#0a0c0e] shadow-lg shadow-[var(--accent-glow)] transition-all hover:brightness-110 hover:shadow-xl active:scale-[0.99]"
            >
              ログイン
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-[var(--muted)] leading-relaxed">
            デモ環境のため、入力内容に関係なくログインできます。
          </p>
        </div>
      </div>
    </main>
  );
}
