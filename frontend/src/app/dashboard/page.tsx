'use client';

import Link from 'next/link';

export default function DashboardHome() {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col">
        <header className="mb-8 md:mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)] mb-3">Home</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-[var(--foreground)] tracking-tight">
            おかえりなさい
          </h1>
          <p className="mt-3 text-[var(--muted)] text-sm md:text-base leading-relaxed max-w-xl">
            チャットで AI と会話したり、今後ここにウィジェットやショートカットを並べていけます。
          </p>
        </header>

        <section aria-labelledby="quick-heading" className="flex-1">
          <h2 id="quick-heading" className="sr-only">
            クイックアクセス
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            <li>
              <Link
                href="/dashboard/chat"
                className="group flex flex-col h-full rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]/70 backdrop-blur-sm p-6 transition-all duration-200 hover:border-[var(--accent)]/35 hover:bg-[var(--bubble)] hover:shadow-[var(--card-shadow)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)] mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <span className="text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                  チャット
                </span>
                <span className="mt-2 text-sm text-[var(--muted)] leading-snug flex-1">
                  AI アシスタントと会話。サイドバーからもいつでも開けます。
                </span>
                <span className="mt-5 inline-flex items-center text-sm font-medium text-[var(--accent)]">
                  開く
                  <span className="ml-1 transition-transform group-hover:translate-x-0.5" aria-hidden>
                    →
                  </span>
                </span>
              </Link>
            </li>
            <li>
              <div className="h-full rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 p-6 flex flex-col">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-[var(--muted)] mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 9h6M9 15h6" />
                  </svg>
                </span>
                <span className="text-base font-medium text-[var(--muted)]">今後の機能</span>
                <p className="mt-2 text-sm text-[var(--muted)]/90 leading-relaxed flex-1">
                  タスク・メモ・連携など、ここにショートカットを追加予定です。
                </p>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
