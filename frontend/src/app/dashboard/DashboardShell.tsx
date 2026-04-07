'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const AUTH_KEY = 'kairos-login';

export function getIsLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(AUTH_KEY) === 'true';
}

export function setLoggedIn(value: boolean) {
  sessionStorage.setItem(AUTH_KEY, value ? 'true' : 'false');
}

const navItems = [
  {
    href: '/dashboard',
    label: 'ホーム',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/dashboard/chat',
    label: 'CHAT',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: '/kairos-quiz',
    label: 'QUIZ',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8M8 11h8M8 15h4" />
      </svg>
    ),
  },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!getIsLoggedIn()) {
      router.replace('/');
      return;
    }
  }, [mounted, router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    setLoggedIn(false);
    router.replace('/');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <span className="text-[var(--muted)] text-sm">読み込み中…</span>
      </div>
    );
  }

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <ul className={`space-y-1 ${mobile ? 'p-2' : 'p-2'}`}>
      {navItems.map((item) => {
        const isExactHome = item.href === '/dashboard';
        const isActive = isExactHome
          ? pathname === '/dashboard'
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar)] ${
                isActive
                  ? 'bg-[var(--accent-muted)] text-[var(--accent)] shadow-[inset_0_0_0_1px_rgba(126,184,163,0.2)]'
                  : 'text-[var(--foreground)]/85 hover:bg-white/[0.06] hover:text-[var(--foreground)]'
              }`}
            >
              <span className={isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] min-h-0 w-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* モバイルオーバーレイ */}
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] md:hidden"
          aria-label="メニューを閉じる"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      {/* サイドバー（デスクトップ固定 / モバイルはスライド） */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex h-full min-h-0 w-[min(280px,88vw)] shrink-0 flex-col
          border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]
          shadow-2xl transition-transform duration-300 ease-out
          md:relative md:inset-auto md:z-0 md:h-full md:shadow-none md:translate-x-0
          ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        aria-label="メインナビゲーション"
      >
        <div className="p-4 border-b border-[var(--sidebar-border)] flex items-center justify-between gap-2">
          <Link href="/dashboard" className="group flex items-center gap-2 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] text-[#0a0c0e] shadow-lg shadow-[var(--accent-glow)]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                aria-hidden
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold tracking-tight text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                Kairos
              </span>
              <span className="block text-[11px] text-[var(--muted)] truncate">
                コントロールセンター
              </span>
            </span>
          </Link>
          <button
            type="button"
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]"
            onClick={() => setMobileNavOpen(false)}
            aria-label="閉じる"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          <NavLinks />
        </nav>
        <div className="p-2 border-t border-[var(--sidebar-border)]">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-[var(--muted)] hover:bg-white/[0.06] hover:text-[var(--foreground)] text-left border-0 cursor-pointer transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            ログアウト
          </button>
        </div>
      </aside>
      {/* メイン（ここだけ縦スクロール。サイドバーはビューポート左に固定） */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* モバイルトップバー */}
        <header className="sticky top-0 z-30 flex md:hidden items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--foreground)] hover:bg-white/[0.06]"
            onClick={() => setMobileNavOpen(true)}
            aria-label="メニューを開く"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-semibold tracking-tight">Kairos</span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-2 md:px-8 md:pb-8 md:pt-6">
          {children}
        </div>
      </div>
    </div>
  );
}
