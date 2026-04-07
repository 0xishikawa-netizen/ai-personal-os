'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  getChaptersBySection,
  getQuestionsByChapter,
  getStats,
  loadStore,
} from '@/lib/quiz';
import { getQuizUserId } from '@/lib/quiz/userId';
import type { QuizChapter, QuizSection, QuizStats, QuizStore } from '@/lib/quiz/types';
import { SectionStudyMemo } from '@/components/quiz/SectionStudyMemo';

function GoldStars({ n }: { n: number }) {
  const c = Math.min(5, Math.max(1, Math.round(n)));
  return (
    <span className="select-none text-[var(--quiz-star)]" aria-label={`難易度 ${c}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < c ? '' : 'text-[var(--quiz-star-dim)]'}>
          ★
        </span>
      ))}
    </span>
  );
}

export function QuizHomeClient() {
  const [store, setStore] = useState<QuizStore | null>(null);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [userSectionId, setUserSectionId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const s = await loadStore();
      setStore(s);
      const uid = getQuizUserId();
      const st = await getStats(uid);
      setStats(st);
    } catch {
      setStore(null);
      setErr('データを読み込めませんでした。API / DB を確認してください。');
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  const sections = store?.sections.slice().sort((a, b) => a.order - b.order) ?? [];
  const sectionId = userSectionId ?? sections[0]?.id ?? '';
  const activeSection = sections.find((s) => s.id === sectionId);
  const chapters: QuizChapter[] =
    !store || !sectionId ? [] : getChaptersBySection(store, sectionId);

  const weakSet = new Set(stats?.weakChapters.map((w) => w.chapterId) ?? []);

  if (!store) {
    return (
      <div className="quiz-theme flex flex-1 flex-col items-center justify-center gap-3 p-6 text-[var(--muted)]">
        <p>{err ?? '読み込み中…'}</p>
        {err && (
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
            onClick={() => void refresh()}
          >
            再試行
          </button>
        )}
      </div>
    );
  }

  const acc = stats ? Math.round(stats.accuracyPercent) : 0;

  return (
    <div className="quiz-theme flex min-h-0 flex-1 flex-col gap-6 pb-8">
      <header className="border-b border-[var(--quiz-divider)] pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--quiz-accent-soft)]">
          KAIROS QUIZ
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--foreground)]">問題集ホーム</h1>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[var(--quiz-card-border)] bg-[var(--quiz-card-bg)] p-4">
          <p className="text-xs text-[var(--quiz-muted)]">総問題数</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">{stats?.totalQuestions ?? '—'}</p>
        </div>
        <div className="rounded-2xl border border-[var(--quiz-card-border)] bg-[var(--quiz-card-bg)] p-4">
          <p className="text-xs text-[var(--quiz-muted)]">回答数</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">{stats?.answerCount ?? '—'}</p>
        </div>
        <div className="rounded-2xl border border-[var(--quiz-card-border)] bg-[var(--quiz-card-bg)] p-4">
          <p className="text-xs text-[var(--quiz-muted)]">正答率</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">{stats ? `${acc}%` : '—'}</p>
        </div>
        <div className="rounded-2xl border border-[var(--quiz-card-border)] bg-[var(--quiz-card-bg)] p-4">
          <p className="text-xs text-[var(--quiz-muted)]">連続学習日数</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">{stats?.streakDays ?? '—'}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap gap-2 border-b border-[var(--quiz-divider)] pb-2">
            {sections.map((s: QuizSection) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setUserSectionId(s.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  sectionId === s.id
                    ? 'bg-[var(--accent)] text-[var(--quiz-on-accent)]'
                    : 'bg-[var(--surface-elevated)] text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {activeSection?.memo?.trim() ? (
            <SectionStudyMemo sectionTitle={activeSection.name} markdown={activeSection.memo.trim()} />
          ) : null}

          <ul className="space-y-3">
            {chapters.map((ch) => {
              const qs = getQuestionsByChapter(store, ch.id);
              const n = qs.length;
              const avgDiff = n ? qs.reduce((a, q) => a + q.difficulty, 0) / n : 0;
              const weak = weakSet.has(ch.id);
              return (
                <li
                  key={ch.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--quiz-card-border)] bg-[var(--quiz-card-bg)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{ch.title}</p>
                    <p className="mt-1 text-xs text-[var(--quiz-muted)]">問題数 {n}</p>
                    {weak && (
                      <p className="mt-1 text-xs text-[var(--quiz-wrong)]">正答率 60% 未満（弱点）</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <GoldStars n={avgDiff} />
                    </div>
                  </div>
                  <Link
                    href={`/kairos-quiz/${encodeURIComponent(ch.id)}`}
                    className="shrink-0 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-center text-sm font-semibold text-[var(--quiz-on-accent)]"
                  >
                    START →
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <aside className="w-full shrink-0 space-y-4 lg:w-72">
          <div className="rounded-2xl border border-[var(--quiz-card-border)] bg-[var(--quiz-card-bg)] p-4">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">弱点チャプター</h2>
            <ul className="mt-2 space-y-2 text-sm text-[var(--quiz-muted)]">
              {(stats?.weakChapters ?? []).slice(0, 8).map((w) => (
                <li key={w.chapterId}>
                  <Link href={`/kairos-quiz/${encodeURIComponent(w.chapterId)}`} className="hover:text-[var(--accent)]">
                    {w.title}（{Math.round(w.accuracyPercent)}%）
                  </Link>
                </li>
              ))}
              {!stats?.weakChapters.length && <li>データなし</li>}
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--quiz-card-border)] bg-[var(--quiz-card-bg)] p-4">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">クイック</h2>
            <p className="mt-2 text-xs text-[var(--quiz-muted)]">
              ランダム10問・今日の復習・難問チャレンジは今後の拡張用です。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
