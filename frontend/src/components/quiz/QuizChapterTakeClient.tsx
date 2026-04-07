'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AnswerRecord, QuizQuestion, QuizStore } from '@/lib/quiz/types';
import { correctLabels } from '@/lib/quiz/types';
import { getSectionForChapter, listQuestionsByChapter, loadStore, submitAnswer } from '@/lib/quiz';
import { getQuizUserId } from '@/lib/quiz/userId';
import { labelsEqual, QuestionCard } from './QuizTakeClient';

type CardState = { selected: string[]; locked: boolean; showExplain: boolean };

function sectionSummaryForChapter(store: QuizStore, chapterId: string, records: AnswerRecord[]) {
  const sec = getSectionForChapter(store, chapterId);
  if (!sec) return [];
  const correct = records.filter((r) => r.correct).length;
  return [{ sectionId: sec.id, sectionName: sec.name, correct, total: records.length }];
}

export function QuizChapterTakeClient() {
  const params = useParams();
  const router = useRouter();
  const chapterId = typeof params.chapterId === 'string' ? params.chapterId : '';

  const [store, setStore] = useState<QuizStore | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [step, setStep] = useState<'quiz' | 'results'>('quiz');
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!chapterId) return;
    let cancelled = false;
    void (async () => {
      try {
        const [st, qs] = await Promise.all([loadStore(), listQuestionsByChapter(chapterId)]);
        if (cancelled) return;
        setStore(st);
        setQuestions(qs);
        const init: Record<string, CardState> = {};
        for (const q of qs) {
          init[q.id] = { selected: [], locked: false, showExplain: false };
        }
        setCards(init);
        setRecords([]);
        setStep('quiz');
        setLoadErr(null);
      } catch {
        if (!cancelled) {
          setLoadErr('読み込みに失敗しました');
          setStore(null);
          setQuestions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  const chapterTitle = useMemo(() => {
    if (!store || !chapterId) return '';
    return store.chapters.find((c) => c.id === chapterId)?.title ?? '';
  }, [store, chapterId]);

  const sectionName = useMemo(() => {
    if (!store || !chapterId) return '';
    const sec = getSectionForChapter(store, chapterId);
    return sec?.name ?? '';
  }, [store, chapterId]);

  const correctCount = useMemo(() => records.filter((r) => r.correct).length, [records]);

  const logAnswer = useCallback(
    async (qid: string, selected: string[], ok: boolean) => {
      setRecords((prev) => {
        const rest = prev.filter((r) => r.questionId !== qid);
        return [...rest, { questionId: qid, selected: [...selected].sort(), correct: ok }];
      });
      try {
        await submitAnswer({
          userId: getQuizUserId(),
          questionId: qid,
          chosen: selected,
        });
      } catch {
        // ログ失敗しても UI は続行
      }
    },
    [],
  );

  const onSelectSingle = useCallback(
    (qid: string, label: string) => {
      const q = questions.find((x) => x.id === qid);
      if (!q || correctLabels(q).length > 1) return;
      const selected = [label];
      setCards((prev) => ({
        ...prev,
        [qid]: { ...prev[qid]!, selected, locked: true },
      }));
      const ok = labelsEqual(selected, correctLabels(q));
      void logAnswer(qid, selected, ok);
    },
    [questions, logAnswer],
  );

  const onToggleChoice = useCallback((qid: string, label: string) => {
    setCards((prev) => {
      const cur = prev[qid];
      if (!cur || cur.locked) return prev;
      const set = new Set(cur.selected);
      if (set.has(label)) set.delete(label);
      else set.add(label);
      return { ...prev, [qid]: { ...cur, selected: [...set].sort() } };
    });
  }, []);

  const onConfirmMulti = useCallback(
    (qid: string) => {
      const q = questions.find((x) => x.id === qid);
      if (!q || correctLabels(q).length <= 1) return;
      setCards((prev) => {
        const cur = prev[qid];
        if (!cur || cur.locked) return prev;
        const selected = cur.selected;
        if (selected.length === 0) return prev;
        const ok = labelsEqual(selected, correctLabels(q));
        queueMicrotask(() => void logAnswer(qid, [...selected], ok));
        return { ...prev, [qid]: { ...cur, locked: true } };
      });
    },
    [questions, logAnswer],
  );

  const allAnswered =
    questions.length > 0 && questions.every((q) => cards[q.id]?.locked);

  if (loadErr || (!questions.length && store)) {
    return (
      <div className="quiz-theme flex flex-1 flex-col items-center gap-4 p-6 text-[var(--muted)]">
        <p>{loadErr ?? 'このチャプターに問題がありません。'}</p>
        <Link href="/kairos-quiz" className="text-[var(--accent)]">
          ホームへ
        </Link>
      </div>
    );
  }

  if (!store || !questions.length) {
    return (
      <div className="quiz-theme flex flex-1 items-center justify-center p-6 text-[var(--muted)]">
        読み込み中…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-1 pb-6 pt-1 md:px-2">
      {step === 'quiz' && (
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="mb-2 flex shrink-0 items-center justify-between gap-3 border-b border-[var(--quiz-divider)] pb-3">
            <button
              type="button"
              onClick={() => router.push('/kairos-quiz')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)]"
              aria-label="戻る"
            >
              ×
            </button>
            <h2 className="flex-1 text-center text-[17px] font-normal lowercase tracking-wide">kairos</h2>
            <span className="w-10" />
          </header>

          <div className="mt-2 shrink-0 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--quiz-accent-soft)]">
              {sectionName}
            </p>
            <h1 className="mt-1 text-[22px] font-bold text-[var(--foreground)]">{chapterTitle}</h1>
            <p className="mt-2 text-[15px] font-medium text-[var(--accent)]">
              正解: {correctCount} / {questions.length}
            </p>
          </div>

          <div className="mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pr-0.5">
            {questions.map((q, i) => {
              const isMulti = q.questionType === 'multiple' || correctLabels(q).length > 1;
              return (
                <QuestionCard
                  key={q.id}
                  q={q}
                  displayId={`${i + 1}`}
                  isMulti={isMulti}
                  state={cards[q.id] ?? { selected: [], locked: false, showExplain: false }}
                  onToggleChoice={(label) => onToggleChoice(q.id, label)}
                  onConfirm={() => onConfirmMulti(q.id)}
                  onSelectSingle={(label) => onSelectSingle(q.id, label)}
                  onShowExplain={() =>
                    setCards((prev) => ({
                      ...prev,
                      [q.id]: { ...prev[q.id]!, showExplain: true },
                    }))
                  }
                />
              );
            })}
          </div>

          {allAnswered && (
            <div className="mt-6 shrink-0">
              <button
                type="button"
                onClick={() => setStep('results')}
                className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-[15px] font-semibold text-[var(--quiz-on-accent)]"
              >
                結果を見る
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'results' && (
        <div className="flex max-w-lg flex-col gap-6">
          <header className="flex items-center justify-between border-b border-[var(--quiz-divider)] pb-3">
            <button
              type="button"
              onClick={() => router.push('/kairos-quiz')}
              className="text-sm text-[var(--accent)]"
            >
              ホーム
            </button>
          </header>
          <h2 className="text-center text-lg font-semibold">今回の結果</h2>
          <div className="rounded-2xl border border-[var(--quiz-card-border)] bg-[var(--quiz-card-bg)] p-6 text-center">
            <p className="text-sm text-[var(--quiz-muted)]">正答率</p>
            <p className="mt-2 text-4xl font-bold text-[var(--accent)]">
              {questions.length ? Math.round((correctCount / questions.length) * 100) : 0}%
            </p>
            <p className="mt-2 text-[var(--quiz-muted)]">
              正解 {correctCount} / {questions.length} 問
            </p>
          </div>
          <ul className="space-y-2">
            {sectionSummaryForChapter(store, chapterId, records).map((r) => (
              <li
                key={r.sectionId}
                className="flex justify-between rounded-xl border border-[var(--quiz-card-border)] px-4 py-3 text-sm"
              >
                <span>{r.sectionName}</span>
                <span className="text-[var(--accent)]">
                  {r.correct}/{r.total}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <Link
              href="/kairos-quiz"
              className="flex-1 rounded-xl border-2 border-[var(--accent)] py-3 text-center text-sm font-medium text-[var(--accent)]"
            >
              ホームへ
            </Link>
            <button
              type="button"
              onClick={() => {
                const init: Record<string, CardState> = {};
                for (const q of questions) {
                  init[q.id] = { selected: [], locked: false, showExplain: false };
                }
                setCards(init);
                setRecords([]);
                setStep('quiz');
              }}
              className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-[var(--quiz-on-accent)]"
            >
              もう一度
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
