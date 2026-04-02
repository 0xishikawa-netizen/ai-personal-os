'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnswerRecord, QuizStore } from '@/lib/quiz/types';
import {
  getChaptersBySection,
  getQuestionsByChapter,
  getSectionForChapter,
  loadStore,
} from '@/lib/quiz/storage';

type Step = 'pick' | 'quiz' | 'results';

type CardState = {
  selected: string[];
  locked: boolean;
  showExplain: boolean;
};

function labelsEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

const BRAND_TITLE = 'kairos';

function GoldStars({ n }: { n: number }) {
  const c = Math.min(5, Math.max(1, Math.round(n)));
  return (
    <span className="select-none" aria-label={`難易度 ${c}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={i < c ? 'text-[var(--quiz-star)]' : 'text-[var(--quiz-star-dim)]'}
          style={{ textShadow: i < c ? '0 0 10px var(--accent-glow)' : undefined }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function QuestionCard({
  q,
  displayId,
  state,
  isMulti,
  onToggleChoice,
  onConfirm,
  onSelectSingle,
  onShowExplain,
}: {
  q: import('@/lib/quiz/types').QuizQuestion;
  displayId: string;
  state: CardState;
  isMulti: boolean;
  onToggleChoice: (label: string) => void;
  onConfirm: () => void;
  onSelectSingle: (label: string) => void;
  onShowExplain: () => void;
}) {
  const correctSorted = useMemo(() => [...q.answers].sort(), [q.answers]);
  const wrong =
    state.locked && !labelsEqual([...state.selected].sort(), correctSorted);

  return (
    <article
      className="rounded-2xl border border-[var(--quiz-card-border)] bg-[var(--quiz-card-bg)] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
      style={{ borderRadius: 14 }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="text-[15px] font-medium text-[var(--quiz-accent-soft)]">問題 {displayId}</span>
        <GoldStars n={q.difficulty} />
      </div>
      <p className="mb-5 text-[16px] leading-relaxed text-[var(--foreground)]">{q.question}</p>
      {isMulti && !state.locked && (
        <p className="mb-3 text-[13px] text-[var(--quiz-muted)]">
          複数正解です。該当するものをすべて選び、「回答する」で確定してください。
        </p>
      )}
      <ul className="space-y-2.5">
        {q.choices.map((ch) => {
          const picked = state.selected.includes(ch.label);
          const isCorrectChoice = q.answers.includes(ch.label);
          let border = 'border border-[var(--quiz-card-border)]';
          let labelCls = 'text-[var(--quiz-accent-soft)]';
          let textCls = 'text-[var(--foreground)]/95';

          if (!state.locked && isMulti && picked) {
            border = 'border-2 border-[var(--accent)]';
            labelCls = 'text-[var(--accent)]';
          }

          if (state.locked) {
            if (picked && isCorrectChoice) {
              border = 'border-2 border-[var(--quiz-correct)]';
              labelCls = 'text-[var(--quiz-correct)]';
            } else if (picked && !isCorrectChoice) {
              border = 'border-2 border-[var(--quiz-wrong)]';
              labelCls = 'text-[var(--quiz-wrong)]';
            } else if (!picked && isCorrectChoice && wrong) {
              border = 'border-2 border-[var(--quiz-correct)]';
              labelCls = 'text-[var(--quiz-correct)]';
            }
          }

          return (
            <li key={ch.label}>
              <button
                type="button"
                disabled={state.locked}
                onClick={() =>
                  isMulti ? onToggleChoice(ch.label) : onSelectSingle(ch.label)
                }
                aria-pressed={picked}
                className={`w-full rounded-[10px] px-4 py-3.5 text-left text-[15px] transition-colors ${border} bg-[var(--quiz-choice-bg)] hover:bg-white/[0.04] disabled:cursor-default`}
              >
                <span className={`font-bold ${labelCls}`}>{ch.label}.</span>{' '}
                <span className={textCls}>{ch.text}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {isMulti && !state.locked && (
        <button
          type="button"
          disabled={state.selected.length === 0}
          onClick={onConfirm}
          className="mt-4 w-full rounded-xl border-2 border-[var(--accent)] bg-[var(--accent-muted)] py-3 text-[15px] font-semibold text-[var(--accent)] disabled:opacity-40"
        >
          回答する
          {state.selected.length > 0 ? `（${[...state.selected].sort().join('・')}）` : ''}
        </button>
      )}

      {state.locked && wrong && (
        <div className="mt-4 flex items-center gap-2 text-[15px] font-medium text-[var(--quiz-wrong)]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--quiz-wrong)] text-sm leading-none">
            ×
          </span>
          不正解
        </div>
      )}

      {state.locked && wrong && (
        <div className="mt-4">
          {!state.showExplain ? (
            <button
              type="button"
              onClick={onShowExplain}
              className="w-full rounded-xl border-2 border-[var(--accent)] bg-transparent py-3.5 text-[15px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-muted)]"
            >
              💡 解説を見る
            </button>
          ) : (
            <div
              className="rounded-xl border border-[var(--quiz-card-border)] bg-black/25 p-4 text-[14px] leading-relaxed text-[var(--quiz-muted)]"
              style={{ borderRadius: 12 }}
            >
              {q.explanation}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function sectionResultsFromRecords(store: QuizStore, records: AnswerRecord[]) {
  const map = new Map<string, { name: string; c: number; t: number }>();
  for (const r of records) {
    const q = store.questions.find((x) => x.id === r.questionId);
    if (!q) continue;
    const sec = getSectionForChapter(store, q.chapterId);
    if (!sec) continue;
    const cur = map.get(sec.id) ?? { name: sec.name, c: 0, t: 0 };
    cur.t += 1;
    if (r.correct) cur.c += 1;
    map.set(sec.id, cur);
  }
  return [...map.entries()].map(([sectionId, v]) => ({
    sectionId,
    sectionName: v.name,
    correct: v.c,
    total: v.t,
  }));
}

function QuizHeaderBar({
  onClose,
}: {
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, []);

  return (
    <header className="mb-2 flex shrink-0 items-center justify-between gap-3 border-b border-[var(--quiz-divider)] pb-3">
      <button
        type="button"
        onClick={onClose}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] transition-colors hover:bg-white/[0.06]"
        aria-label="閉じる"
      >
        ×
      </button>
      <h2 className="flex-1 text-center text-[17px] font-normal lowercase tracking-wide text-[var(--foreground)]">
        {BRAND_TITLE}
      </h2>
      <div className="relative shrink-0" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] hover:bg-white/[0.06]"
          aria-label="メニュー"
          aria-expanded={open}
        >
          ⋯
        </button>
        {open && (
          <div className="absolute right-0 top-11 z-20 min-w-[160px] rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] py-1 shadow-xl">
            <Link
              href="/kairos-quiz/admin"
              className="block px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-white/[0.06]"
              onClick={() => setOpen(false)}
            >
              管理画面
            </Link>
            <Link
              href="/dashboard"
              className="block px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-white/[0.06]"
              onClick={() => setOpen(false)}
            >
              ダッシュボード
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export function QuizTakeClient() {
  const [store, setStore] = useState<QuizStore | null>(null);
  const [step, setStep] = useState<Step>('pick');
  const [sectionId, setSectionId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [records, setRecords] = useState<AnswerRecord[]>([]);

  useEffect(() => {
    loadStore()
      .then(setStore)
      .catch(() => setStore(null));
  }, []);

  const sections = store?.sections.slice().sort((a, b) => a.order - b.order) ?? [];
  const chapters = useMemo(() => {
    if (!store || !sectionId) return [];
    return getChaptersBySection(store, sectionId);
  }, [store, sectionId]);

  const questions = useMemo(() => {
    if (!store || !chapterId) return [];
    return getQuestionsByChapter(store, chapterId);
  }, [store, chapterId]);

  const chapterTitle = useMemo(() => {
    if (!store || !chapterId) return '';
    return store.chapters.find((c) => c.id === chapterId)?.title ?? '';
  }, [store, chapterId]);

  const sectionName = useMemo(() => {
    if (!store || !sectionId) return '';
    return store.sections.find((s) => s.id === sectionId)?.name ?? '';
  }, [store, sectionId]);

  const chapterOrderInSection = useMemo(() => {
    if (!store || !chapterId || !sectionId) return 1;
    const list = getChaptersBySection(store, sectionId);
    const idx = list.findIndex((c) => c.id === chapterId);
    return idx >= 0 ? idx + 1 : 1;
  }, [store, chapterId, sectionId]);

  const correctCount = useMemo(() => records.filter((r) => r.correct).length, [records]);

  const startQuiz = useCallback(() => {
    if (!chapterId || questions.length === 0) return;
    const init: Record<string, CardState> = {};
    for (const q of questions) {
      init[q.id] = { selected: [], locked: false, showExplain: false };
    }
    setCards(init);
    setRecords([]);
    setStep('quiz');
  }, [chapterId, questions]);

  const onSelectSingle = useCallback(
    (qid: string, label: string) => {
      const q = questions.find((x) => x.id === qid);
      if (!q || q.answers.length > 1) return;
      const selected = [label];
      setCards((prev) => ({
        ...prev,
        [qid]: { ...prev[qid], selected, locked: true },
      }));
      const ok = labelsEqual(selected, q.answers);
      setRecords((prev) => {
        const rest = prev.filter((r) => r.questionId !== qid);
        return [...rest, { questionId: qid, selected, correct: ok }];
      });
    },
    [questions],
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
      if (!q || q.answers.length <= 1) return;
      setCards((prev) => {
        const cur = prev[qid];
        if (!cur || cur.locked) return prev;
        const selected = cur.selected;
        if (selected.length === 0) return prev;
        const ok = labelsEqual(selected, q.answers);
        setRecords((rprev) => {
          const rest = rprev.filter((r) => r.questionId !== qid);
          return [...rest, { questionId: qid, selected: [...selected].sort(), correct: ok }];
        });
        return { ...prev, [qid]: { ...cur, locked: true } };
      });
    },
    [questions],
  );

  const allAnswered =
    questions.length > 0 && questions.every((q) => cards[q.id]?.locked);

  const goResults = useCallback(() => {
    setStep('results');
  }, []);

  const resetPick = useCallback(() => {
    setStep('pick');
    setCards({});
    setRecords([]);
  }, []);

  if (!store) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center text-[var(--quiz-muted)]">
        <p>読み込み中…</p>
        <p className="max-w-sm text-xs">
          データが表示されない場合は API（localhost:8080）と DB が起動しているか確認してください。
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-1 pb-6 pt-1 md:px-2">
      {step === 'pick' && (
        <>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--quiz-accent-soft)]">
            問題集
          </p>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">チャプターを選ぶ</h1>
          <p className="mt-2 text-sm text-[var(--quiz-muted)]">
            セクションは勉強ジャンル、チャプターはその中の単元です。
          </p>
          <div className="mt-6 flex max-w-lg flex-col gap-4">
            <label className="block text-sm text-[var(--quiz-muted)]">
              セクション
              <select
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-[var(--foreground)]"
                value={sectionId}
                onChange={(e) => {
                  setSectionId(e.target.value);
                  setChapterId('');
                }}
              >
                <option value="">選択してください</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-[var(--quiz-muted)]">
              チャプター
              <select
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-[var(--foreground)]"
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                disabled={!sectionId}
              >
                <option value="">選択してください</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={startQuiz}
              disabled={!chapterId || questions.length === 0}
              className="rounded-xl bg-[var(--accent)] px-5 py-3.5 text-sm font-semibold text-[var(--quiz-on-accent)] shadow-lg shadow-[var(--accent-glow)] disabled:opacity-40"
            >
              開始
            </button>
            {chapterId && questions.length === 0 && (
              <p className="text-sm text-[var(--quiz-wrong)]">問題がありません。管理画面で追加してください。</p>
            )}
          </div>
        </>
      )}

      {step === 'quiz' && (
        <div className="flex min-h-0 flex-1 flex-col">
          <QuizHeaderBar onClose={resetPick} />

          <div className="mt-2 shrink-0 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--quiz-accent-soft)]">
              {sectionName || '問題集'}
            </p>
            <h1 className="mt-1 text-[22px] font-bold leading-tight text-[var(--foreground)] md:text-[24px]">
              {chapterTitle || 'Chapter'}
            </h1>
            <p className="mt-2 text-[13px] text-[var(--quiz-muted)]">
              1 つだけ正解の問題はタップで確定。複数正解は選んでから「回答する」で確定します。
            </p>
            <div className="mx-auto my-4 h-px max-w-xs bg-[var(--quiz-divider)]" />
            <p className="text-[15px] font-medium text-[var(--accent)]">
              正解: {correctCount} / {questions.length}
            </p>
          </div>

          <div className="mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pr-0.5">
            {questions.map((q, i) => {
              const isMulti = q.answers.length > 1;
              return (
                <QuestionCard
                  key={q.id}
                  q={q}
                  displayId={`${chapterOrderInSection}-${i + 1}`}
                  isMulti={isMulti}
                  state={cards[q.id] ?? { selected: [], locked: false, showExplain: false }}
                  onToggleChoice={(label) => onToggleChoice(q.id, label)}
                  onConfirm={() => onConfirmMulti(q.id)}
                  onSelectSingle={(label) => onSelectSingle(q.id, label)}
                  onShowExplain={() =>
                    setCards((prev) => ({
                      ...prev,
                      [q.id]: { ...prev[q.id], showExplain: true },
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
                onClick={goResults}
                className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-[15px] font-semibold text-[var(--quiz-on-accent)] shadow-lg shadow-[var(--accent-glow)]"
              >
                結果を見る
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'results' && store && (
        <div className="flex max-w-lg flex-col gap-6">
          <QuizHeaderBar onClose={resetPick} />
          <h2 className="text-center text-lg font-semibold text-[var(--foreground)]">今回の結果</h2>
          <div className="rounded-2xl border border-[var(--quiz-card-border)] bg-[var(--quiz-card-bg)] p-6 text-center">
            <p className="text-sm text-[var(--quiz-muted)]">正答率</p>
            <p className="mt-2 text-4xl font-bold text-[var(--accent)]">
              {questions.length ? Math.round((correctCount / questions.length) * 100) : 0}%
            </p>
            <p className="mt-2 text-[var(--quiz-muted)]">
              正解 {correctCount} / {questions.length} 問
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium text-[var(--foreground)]">セクション別</h3>
            <ul className="space-y-2">
              {sectionResultsFromRecords(store, records).map((r) => (
                <li
                  key={r.sectionId}
                  className="flex justify-between rounded-xl border border-[var(--quiz-card-border)] bg-[var(--quiz-choice-bg)] px-4 py-3 text-sm text-[var(--foreground)]"
                >
                  <span>{r.sectionName}</span>
                  <span className="text-[var(--accent)]">
                    {r.correct}/{r.total}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={resetPick}
              className="flex-1 rounded-xl border-2 border-[var(--accent)] bg-transparent py-3 text-sm font-medium text-[var(--accent)]"
            >
              別のチャプターへ
            </button>
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
