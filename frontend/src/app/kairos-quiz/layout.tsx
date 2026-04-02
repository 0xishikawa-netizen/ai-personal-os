import Link from 'next/link';
import DashboardShell from '@/app/dashboard/DashboardShell';
import './quiz-theme.css';

export default function KairosQuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <div className="kairos-quiz-shell quiz-theme flex min-h-0 flex-1 flex-col overflow-y-auto">
        <nav className="mb-3 flex shrink-0 flex-wrap items-center justify-end gap-3 border-b border-[var(--quiz-divider)] pb-3 text-xs">
          <Link
            href="/kairos-quiz"
            className="text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
          >
            解答
          </Link>
          <Link
            href="/kairos-quiz/admin"
            className="text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
          >
            管理
          </Link>
        </nav>
        {children}
      </div>
    </DashboardShell>
  );
}
