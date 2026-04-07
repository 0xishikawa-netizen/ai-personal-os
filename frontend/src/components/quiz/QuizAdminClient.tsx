'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Worker as TesseractWorker } from 'tesseract.js';
import type { QuizChapter, QuizQuestion, QuizSection, QuizStore } from '@/lib/quiz/types';
import { parseOcrTextToDraft } from '@/lib/quiz/ocr';
import {
  QUIZ_ADMIN_MSG,
  QUIZ_CHOICE_LABELS,
  addChapter,
  addSection,
  correctLabels,
  deleteChapter,
  deleteQuestion,
  deleteSection,
  exportJson,
  getChaptersBySection,
  getQuestionsByChapter,
  importAndSave,
  importCsvFile,
  importMarkdownFile,
  loadStore,
  parseQuizImportJson,
  saveQuestion,
  updateSection,
} from '@/lib/quiz';

function buildImportPreviewRows(store: QuizStore) {
  const sectionNameById = new Map(store.sections.map((s) => [s.id, s.name]));
  const chapterById = new Map(store.chapters.map((c) => [c.id, c]));
  const chapterOrder = (id: string) => chapterById.get(id)?.order ?? 0;
  const questions = [...store.questions].sort((a, b) => {
    const co = chapterOrder(a.chapterId) - chapterOrder(b.chapterId);
    if (co !== 0) return co;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id.localeCompare(b.id);
  });
  return questions.map((q) => {
    const ch = chapterById.get(q.chapterId);
    return {
      q,
      sectionName: ch ? (sectionNameById.get(ch.sectionId) ?? '—') : '—',
      chapterTitle: ch?.title ?? '—',
    };
  });
}

function QuizImportStorePreview({
  store,
  heading,
  onDismiss,
}: {
  store: QuizStore;
  heading: string;
  onDismiss?: () => void;
}) {
  const rows = useMemo(() => buildImportPreviewRows(store), [store]);
  return (
    <div className="mt-3 rounded-xl border border-[var(--quiz-card-border)] bg-[var(--quiz-card-bg)]/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--quiz-divider)] px-3 py-2.5">
        <h4 className="text-sm font-semibold text-[var(--foreground)]">{heading}</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-[var(--muted)]">{rows.length} 問</span>
          {onDismiss && (
            <button
              type="button"
              className="rounded-md border border-[var(--quiz-card-border)] bg-[var(--quiz-choice-bg)]/50 px-2 py-1 text-xs text-[var(--foreground)]"
              onClick={onDismiss}
            >
              閉じる
            </button>
          )}
        </div>
      </div>
      <div className="max-h-[min(52vh,600px)] space-y-4 overflow-y-auto p-3">
        {rows.map(({ q, sectionName, chapterTitle }, i) => {
          const ans = correctLabels(q);
          const choiceRows = [...q.choices].sort((a, b) => a.label.localeCompare(b.label));
          return (
            <article
              key={q.id}
              className="rounded-lg border border-[var(--quiz-card-border)] bg-[var(--quiz-choice-bg)]/40 p-3 text-[15px] leading-relaxed"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
                <span className="tabular-nums font-medium text-[var(--foreground)]">#{i + 1}</span>
                <span className="line-clamp-1">{sectionName}</span>
                <span aria-hidden>›</span>
                <span className="line-clamp-1">{chapterTitle}</span>
                <span className="ml-auto shrink-0 font-medium text-[var(--quiz-correct)]">
                  正解 {ans.length ? ans.join('・') : '—'}
                </span>
                {q.questionType === 'multiple' && (
                  <span className="shrink-0 rounded bg-[var(--quiz-accent-dim)] px-1.5 py-0.5 text-[10px] text-[var(--quiz-accent-bright)]">
                    複数選択
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[var(--foreground)]">{q.body.trim() || '（問題文なし）'}</p>
              <ul className="mt-2 space-y-1.5 border-t border-[var(--quiz-divider)] pt-2">
                {choiceRows.map((c) => {
                  const empty = !c.body.trim();
                  if (empty && !c.isCorrect) return null;
                  return (
                    <li
                      key={c.id}
                      className={`flex gap-2 text-sm ${c.isCorrect ? 'font-medium text-[var(--quiz-correct)]' : 'text-[var(--foreground)]'}`}
                    >
                      <span className="w-6 shrink-0 font-mono text-xs opacity-80">{c.label}</span>
                      <span className="min-w-0 flex-1 whitespace-pre-wrap">
                        {empty ? '（本文なし）' : c.body}
                        {c.isCorrect ? ' · 正解' : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {q.explanation?.trim() ? (
                <p className="mt-2 border-t border-[var(--quiz-divider)] pt-2 text-[13px] leading-relaxed text-[var(--muted)]">
                  <span className="font-semibold text-[var(--foreground)]">解説 </span>
                  <span className="whitespace-pre-wrap text-[var(--foreground)]/90">{q.explanation.trim()}</span>
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function emptyQuestion(chapterId: string): QuizQuestion {
  return {
    id: `q-${crypto.randomUUID().slice(0, 8)}`,
    chapterId,
    body: '',
    choices: QUIZ_CHOICE_LABELS.map((label) => ({
      id: `c-${label}-${crypto.randomUUID().slice(0, 6)}`,
      label,
      body: '',
      isCorrect: label === 'A',
    })),
    explanation: '',
    difficulty: 2,
    questionType: 'single',
    sortOrder: 0,
  };
}

function questionFromOcrDraft(
  chapterId: string,
  draft: ReturnType<typeof parseOcrTextToDraft>,
): QuizQuestion | null {
  const choices = QUIZ_CHOICE_LABELS.map((label) => {
    const found = draft.choices.find((c) => c.label.toUpperCase() === label);
    return {
      id: `c-${label}-${crypto.randomUUID().slice(0, 6)}`,
      label,
      body: found?.text ?? '',
      isCorrect: label === 'A',
    };
  }).filter((choice) => choice.body.trim());

  if (choices.length < 2 || !draft.question.trim()) return null;

  return {
    id: `q-${crypto.randomUUID().slice(0, 8)}`,
    chapterId,
    body: draft.question.trim(),
    choices,
    explanation: '',
    difficulty: 2,
    questionType: 'single',
    sortOrder: 0,
  };
}

export function QuizAdminClient() {
  const [store, setStore] = useState<QuizStore | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [editing, setEditing] = useState<QuizQuestion | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ current: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragOverBulk, setDragOverBulk] = useState(false);
  const [ocrMergeMulti, setOcrMergeMulti] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const [importText, setImportText] = useState('');
  const [dragOverJson, setDragOverJson] = useState(false);

  const importLint = useMemo(() => {
    if (!importText.trim()) return null;
    return parseQuizImportJson(importText);
  }, [importText]);

  const importJsonDisabled = !importText.trim() || (importLint != null && !importLint.ok);

  const [bulkTab, setBulkTab] = useState<'csv' | 'md'>('csv');
  const [bulkBusy, setBulkBusy] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const mdInputRef = useRef<HTMLInputElement>(null);
  const jsonImportFileRef = useRef<HTMLInputElement>(null);
  const importFeedbackRef = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState('');
  const [sectionMemoDraft, setSectionMemoDraft] = useState('');
  const [memoSaveFeedback, setMemoSaveFeedback] = useState<
    { kind: 'success' } | { kind: 'error'; text: string } | null
  >(null);
  const [memoSaving, setMemoSaving] = useState(false);
  const [importActionFeedback, setImportActionFeedback] = useState<
    { kind: 'success'; text: string } | { kind: 'error'; text: string } | null
  >(null);
  const [importPostSaveStore, setImportPostSaveStore] = useState<QuizStore | null>(null);

  const refresh = useCallback(async () => {
    setBootError(null);
    try {
      const s = await loadStore();
      setStore(s);
    } catch (e) {
      setStore(null);
      const hint = QUIZ_ADMIN_MSG.bootHint;
      const detail = e instanceof Error ? e.message : String(e);
      setBootError(`${detail}\n\n${hint}`);
    }
  }, []);

  const runQuizJsonImport = useCallback(
    async (dryRun: boolean, strategy: 'merge' | 'replace') => {
      if (!importText.trim()) return;
      try {
        const r = await importAndSave(importText, { dryRun, strategy });
        if (!r.ok) {
          const t = r.code ? `[${r.code}] ${r.error}` : r.error;
          setImportActionFeedback({ kind: 'error', text: t });
          return;
        }
        if (r.preview) {
          setImportActionFeedback({
            kind: 'success',
            text: `サーバー確認OK（DBは未変更）。大分類 ${r.preview.sections} 件・チャプター ${r.preview.chapters} 件・問題 ${r.preview.questions} 件`,
          });
          return;
        }
        const snap = parseQuizImportJson(importText);
        if (snap.ok) {
          setImportPostSaveStore(snap.store);
        }
        setImportText('');
        await refresh();
        const n = r.imported;
        const mode =
          strategy === 'merge'
            ? '既存データを残したまま追加・更新'
            : 'いったんすべて削除してから取り込み';
        setImportActionFeedback({
          kind: 'success',
          text: n
            ? `取り込み完了（${mode}）。大分類 ${n.sections} 件・チャプター ${n.chapters} 件・問題 ${n.questions} 件`
            : `取り込み完了（${mode}）`,
        });
      } catch {
        setImportActionFeedback({ kind: 'error', text: QUIZ_ADMIN_MSG.importFailed });
      }
    },
    [importText, refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!importText.trim()) return;
    setImportActionFeedback(null);
    setImportPostSaveStore(null);
  }, [importText]);

  useEffect(() => {
    if (!importActionFeedback) return;
    window.requestAnimationFrame(() => {
      importFeedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [importActionFeedback]);

  const sections = store?.sections.slice().sort((a, b) => a.order - b.order) ?? [];

  useEffect(() => {
    if (!sectionId || !store) {
      setSectionMemoDraft('');
      return;
    }
    const sec = store.sections.find((s) => s.id === sectionId);
    setSectionMemoDraft(sec?.memo ?? '');
  }, [sectionId, store]);

  useEffect(() => {
    setMemoSaveFeedback(null);
  }, [sectionId]);

  useEffect(() => {
    if (!memoSaveFeedback || memoSaveFeedback.kind !== 'success') return;
    const t = window.setTimeout(() => setMemoSaveFeedback(null), 3500);
    return () => window.clearTimeout(t);
  }, [memoSaveFeedback]);

  const chapters = useMemo(() => {
    if (!store || !sectionId) return [];
    return getChaptersBySection(store, sectionId);
  }, [store, sectionId]);

  const questionsInChapter = useMemo(() => {
    if (!store || !chapterId) return [];
    return getQuestionsByChapter(store, chapterId);
  }, [store, chapterId]);

  const questionCountByChapter = useMemo(() => {
    const m = new Map<string, number>();
    if (!store) return m;
    for (const q of store.questions) {
      m.set(q.chapterId, (m.get(q.chapterId) ?? 0) + 1);
    }
    return m;
  }, [store]);

  const totalQuestionsInSection = useMemo(() => {
    if (!store || !sectionId) return 0;
    const chIds = new Set(chapters.map((c) => c.id));
    return store.questions.filter((q) => chIds.has(q.chapterId)).length;
  }, [store, sectionId, chapters]);

  const onSaveQuestion = async () => {
    if (!editing) return;

    if (!editing.body.trim()) {
      setMsg('問題文を入力してください');
      return;
    }

    const filled = editing.choices.filter((c) => c.body.trim());
    if (filled.length < 2) {
      setMsg('選択肢は2つ以上入力してください');
      return;
    }

    const correctN = filled.filter((c) => c.isCorrect).length;
    if (correctN < 1) {
      setMsg('正解を1つ以上選んでください');
      return;
    }

    const qType = correctN > 1 ? 'multiple' : 'single';
    const q: QuizQuestion = {
      ...editing,
      chapterId,
      choices: filled,
      questionType: qType,
    };

    try {
      await saveQuestion(q);
      await refresh();
      setMsg('保存しました');
      setEditing(null);
    } catch {
      setMsg('保存に失敗しました');
    }
  };

  const applyDraftToEditing = useCallback((draft: ReturnType<typeof parseOcrTextToDraft>) => {
    setEditing((prev) => {
      if (!prev) return prev;

      const next = { ...prev };

      if (draft.question.trim()) {
        next.body = draft.question.trim();
      }

      if (draft.choices.length >= 2) {
        next.choices = QUIZ_CHOICE_LABELS.map((label) => {
          const found = draft.choices.find((c) => c.label.toUpperCase() === label);
          const old = prev.choices.find((c) => c.label === label);

          return {
            id: old?.id ?? `c-${label}-${crypto.randomUUID().slice(0, 6)}`,
            label,
            body: found?.text ?? old?.body ?? '',
            isCorrect: old?.isCorrect ?? label === 'A',
          };
        });
      }

      return next;
    });
  }, []);

  const runOcrFiles = async (files: FileList | File[] | null) => {
    const list = files ? Array.from(files) : [];
    const imageFiles = list.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    if (imageFiles.length > 1 && !(editing && ocrMergeMulti) && !chapterId) {
      setMsg('1 枚=1 問で一括取り込みするには、先にチャプターを選んでください。');
      return;
    }

    if (imageFiles.length === 1 && !editing && !chapterId) {
      setMsg('フォームを開くか、チャプターを選んでから画像をドロップしてください。');
      return;
    }

    setOcrBusy(true);
    setOcrProgress({ current: 0, total: imageFiles.length });
    setMsg('');

    let worker: TesseractWorker | null = null;

    try {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('jpn+eng');

      const parts: string[] = [];

      for (let i = 0; i < imageFiles.length; i++) {
        setOcrProgress({ current: i + 1, total: imageFiles.length });
        const {
          data: { text },
        } = await worker.recognize(imageFiles[i]);
        parts.push(text.trim());
      }

      setOcrProgress(null);

      const n = imageFiles.length;

      if (n === 1) {
        const draft = parseOcrTextToDraft(parts[0] ?? '');

        if (editing) {
          applyDraftToEditing(draft);
          setMsg('1 枚を OCR しました。内容を確認してください。');
          return;
        }

        if (chapterId) {
          const q = questionFromOcrDraft(chapterId, draft);
          if (!q) {
            setMsg(
              '本文・選択肢を十分に認識できませんでした。画質を確認するか手入力してください。',
            );
            return;
          }

          try {
            await saveQuestion(q);
            await refresh();
            setMsg('1 問を OCR から追加しました。登録済み一覧で確認・編集できます。');
          } catch {
            setMsg('問題の保存に失敗しました');
          }
          return;
        }

        setMsg('フォームを開くか、チャプターを選んでからもう一度お試しください。');
        return;
      }

      if (editing && ocrMergeMulti) {
        const combined = parts.filter(Boolean).join('\n\n');
        const draft = parseOcrTextToDraft(combined);
        applyDraftToEditing(draft);
        setMsg(`${n} 枚を 1 問にまとめて OCR しました。内容を確認してください。`);
        return;
      }

      if (!chapterId) {
        setMsg('複数枚を別々の問題にするにはチャプターを選んでください。');
        return;
      }

      const drafts = parts.map((text) => parseOcrTextToDraft(text));
      let added = 0;
      let skipped = 0;

      if (editing) {
        if (drafts[0]) {
          applyDraftToEditing(drafts[0]);
        }

        for (let i = 1; i < drafts.length; i++) {
          const draft = drafts[i];
          if (!draft) {
            skipped += 1;
            continue;
          }

          const q = questionFromOcrDraft(chapterId, draft);
          if (!q) {
            skipped += 1;
            continue;
          }

          try {
            await saveQuestion(q);
            added += 1;
          } catch {
            skipped += 1;
          }
        }

        await refresh();
        setMsg(
          `先頭をフォームに反映し、追加で ${added} 問を保存しました。${
            skipped ? `（${skipped} 枚は内容不足または保存失敗でスキップ）` : ''
          }`,
        );
        return;
      }

      for (const draft of drafts) {
        const q = questionFromOcrDraft(chapterId, draft);
        if (!q) {
          skipped += 1;
          continue;
        }

        try {
          await saveQuestion(q);
          added += 1;
        } catch {
          skipped += 1;
        }
      }

      await refresh();
      setMsg(
        `${added} 問を一括で追加しました。${
          skipped ? `（${skipped} 枚は内容不足または保存失敗でスキップ）` : ''
        } 一覧から正解・解説を整えてください。`,
      );
    } catch (e) {
      setMsg(e instanceof Error ? `OCR に失敗しました: ${e.message}` : 'OCR に失敗しました。');
      setOcrProgress(null);
    } finally {
      if (worker) {
        await worker.terminate();
      }
      setOcrBusy(false);
    }
  };

  if (!store) {
    return (
      <div className="quiz-theme quiz-admin mx-auto max-w-lg space-y-4 p-4 text-[var(--muted)] leading-relaxed">
        <p className="whitespace-pre-wrap text-sm">{bootError ?? '読み込み中…'}</p>
        {bootError && (
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)]"
            onClick={() => void refresh()}
          >
            再試行
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="quiz-theme quiz-admin flex min-h-0 flex-1 flex-col pb-12">
      <div className="quiz-admin-inner flex flex-col gap-10">
      <header className="border-b border-[var(--quiz-divider)]/80 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--quiz-accent-soft)]">
          管理
        </p>
        <h1 className="mt-2 text-[1.35rem] font-semibold tracking-tight text-[var(--foreground)]">
          問題の登録・編集
        </h1>
        <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-[var(--muted)]">
          問題データは PostgreSQL（API 経由）に保存されます。画像はブラウザ内
          OCR（Tesseract）で下書きに流し込みます。
        </p>
      </header>

      {msg && (
        <p className="rounded-xl border border-[var(--quiz-card-border)] bg-[var(--quiz-card-bg)]/85 px-4 py-3 text-[15px] leading-relaxed text-[var(--foreground)] shadow-sm">
          {msg}
        </p>
      )}

      <section className="quiz-admin-section">
        <h2 className="mb-4 text-[15px] font-semibold text-[var(--foreground)]">セクション</h2>

        <div className="flex flex-wrap gap-2">
          {sections.map((s: QuizSection) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSectionId(s.id);
                setChapterId('');
                setEditing(null);
              }}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                sectionId === s.id
                  ? 'border-[var(--quiz-accent)] bg-[var(--quiz-accent-dim)] text-[var(--quiz-accent-bright)]'
                  : 'border-[var(--quiz-card-border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="min-w-[200px] flex-1 rounded-lg border border-[var(--quiz-card-border)] bg-[var(--quiz-choice-bg)]/80 px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]"
            placeholder="新規セクション名"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
          />
          <button
            type="button"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--quiz-on-accent)]"
            onClick={() => {
              void (async () => {
                if (!newSectionName.trim()) return;
                try {
                  await addSection(newSectionName.trim());
                  setNewSectionName('');
                  await refresh();
                } catch {
                  setMsg('セクションの追加に失敗しました');
                }
              })();
            }}
          >
            追加
          </button>

          {sectionId && (
            <button
              type="button"
              className="rounded-lg border border-[var(--quiz-wrong)] px-4 py-2 text-sm text-[var(--quiz-wrong)]"
              onClick={() => {
                void (async () => {
                  if (!confirm('セクションと配下のチャプター・問題をすべて削除しますか？')) return;
                  try {
                    await deleteSection(sectionId);
                    setSectionId('');
                    setChapterId('');
                    setEditing(null);
                    await refresh();
                  } catch {
                    setMsg('削除に失敗しました');
                  }
                })();
              }}
            >
              削除
            </button>
          )}
        </div>

        {sectionId && (
          <div className="mt-5 space-y-2 border-t border-[var(--border)] pt-4">
            <label
              className="block text-sm font-medium text-[var(--foreground)]"
              htmlFor="section-memo"
            >
              大分類メモ（Markdown）
            </label>
            <p className="text-xs text-[var(--muted)]">
              問題集ホームで「本章のポイント」風に表示されます。参考書のように{' '}
              <code className="rounded bg-[var(--quiz-accent-dim)] px-1">## 本章のポイント</code> や{' '}
              <code className="rounded bg-[var(--quiz-accent-dim)] px-1">### ▶ 見出し</code>、{' '}
              <code className="rounded bg-[var(--quiz-accent-dim)] px-1">**重要キーワード**</code>{' '}
              などで構成してください。
            </p>
            <textarea
              id="section-memo"
              className="min-h-[220px] w-full rounded-lg border border-[var(--quiz-card-border)] bg-[var(--quiz-choice-bg)]/80 px-3 py-2.5 font-mono text-sm leading-relaxed text-[var(--foreground)] placeholder:text-[var(--muted)]"
              placeholder={`## 本章のポイント\n\n### ▶ HTTP / HTTPS\n\nリクエストとレスポンスの流れ。\n\n**重要キーワード**  \nHTTP, HTTPS, ステータスコード`}
              value={sectionMemoDraft}
              onChange={(e) => setSectionMemoDraft(e.target.value)}
              spellCheck={false}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={memoSaving}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--quiz-on-accent)] disabled:opacity-50"
                onClick={() => {
                  void (async () => {
                    setMemoSaving(true);
                    setMemoSaveFeedback(null);
                    try {
                      const updated = await updateSection(sectionId, { memo: sectionMemoDraft });
                      await refresh();
                      setStore((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          sections: prev.sections.map((s) =>
                            s.id === sectionId ? { ...s, ...updated } : s,
                          ),
                        };
                      });
                      setMemoSaveFeedback({ kind: 'success' });
                    } catch (e) {
                      const text =
                        e instanceof Error ? e.message : QUIZ_ADMIN_MSG.sectionMemoSaveFailed;
                      setMemoSaveFeedback({ kind: 'error', text });
                      setMsg(text);
                    } finally {
                      setMemoSaving(false);
                    }
                  })();
                }}
              >
                {memoSaving ? '保存中…' : 'メモを保存'}
              </button>
              {memoSaveFeedback?.kind === 'success' && (
                <span
                  role="status"
                  className="text-sm font-medium text-[var(--quiz-correct)]"
                >
                  {QUIZ_ADMIN_MSG.sectionMemoSaved}
                </span>
              )}
              {memoSaveFeedback?.kind === 'error' && (
                <span role="alert" className="text-sm text-[var(--quiz-wrong)]">
                  {memoSaveFeedback.text}
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="quiz-admin-section">
        <h2 className="mb-4 text-[15px] font-semibold text-[var(--foreground)]">チャプター</h2>

        <div className="flex flex-wrap gap-2">
          {chapters.map((c: QuizChapter) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setChapterId(c.id);
                setEditing(null);
              }}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                chapterId === c.id
                  ? 'border-[var(--quiz-accent)] bg-[var(--quiz-accent-dim)] text-[var(--quiz-accent-bright)]'
                  : 'border-[var(--quiz-card-border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]'
              }`}
            >
              <span>{c.title}</span>
              <span className="ml-1.5 tabular-nums text-xs opacity-75">
                {questionCountByChapter.get(c.id) ?? 0}問
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="min-w-[200px] flex-1 rounded-lg border border-[var(--quiz-card-border)] bg-[var(--quiz-choice-bg)]/80 px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]"
            placeholder="新規チャプター名"
            value={newChapterTitle}
            onChange={(e) => setNewChapterTitle(e.target.value)}
            disabled={!sectionId}
          />
          <button
            type="button"
            disabled={!sectionId || !newChapterTitle.trim()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--quiz-on-accent)] disabled:opacity-40"
            onClick={() => {
              void (async () => {
                try {
                  await addChapter(sectionId, newChapterTitle.trim());
                  setNewChapterTitle('');
                  await refresh();
                } catch {
                  setMsg('チャプターの追加に失敗しました');
                }
              })();
            }}
          >
            追加
          </button>

          {chapterId && (
            <button
              type="button"
              className="rounded-lg border border-[var(--quiz-wrong)] px-4 py-2 text-sm text-[var(--quiz-wrong)]"
              onClick={() => {
                void (async () => {
                  if (!confirm('チャプターとその問題をすべて削除しますか？')) return;
                  try {
                    await deleteChapter(chapterId);
                    setChapterId('');
                    setEditing(null);
                    await refresh();
                  } catch {
                    setMsg('削除に失敗しました');
                  }
                })();
              }}
            >
              削除
            </button>
          )}
        </div>
      </section>

      <section className="quiz-admin-section">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">問題の編集</h2>
            {chapterId && store && (
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
                このチャプター{' '}
                <span className="font-medium text-[var(--foreground)]">
                  {questionsInChapter.length}
                </span>{' '}
                問 · 選択中の大分類では合計{' '}
                <span className="font-medium text-[var(--foreground)]">
                  {totalQuestionsInSection}
                </span>{' '}
                問（他チャプターの問題はタブを切り替えると表示されます）
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={!chapterId}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--quiz-on-accent)] disabled:opacity-40"
            onClick={() => {
              if (!chapterId) return;
              const nextOrder =
                questionsInChapter.reduce((m, q) => Math.max(m, q.sortOrder), -1) + 1;
              setEditing({ ...emptyQuestion(chapterId), sortOrder: nextOrder });
            }}
          >
            新規問題
          </button>
        </div>

        {chapterId && (
          <div className="mb-6 space-y-2 rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-accent-dim)]/30 p-4">
            <p className="text-sm font-medium text-[var(--foreground)]">一括 OCR（1 枚 = 1 問）</p>
            <p className="text-xs text-[var(--muted)]">
              フォームを開かずに、複数画像をまとめてこのチャプターへ追加できます。認識できなかった枚はスキップされます。
            </p>

            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  bulkFileInputRef.current?.click();
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOverBulk(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverBulk(false);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOverBulk(false);
                void runOcrFiles(e.dataTransfer.files);
              }}
              onClick={() => bulkFileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                dragOverBulk
                  ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                  : 'border-[var(--border)] bg-[var(--background)]/30 hover:border-[var(--border-strong)]'
              } ${ocrBusy ? 'pointer-events-none opacity-60' : ''}`}
            >
              <span className="text-sm text-[var(--foreground)]">
                画像を複数枚ドロップ（またはクリック）
              </span>
              <span className="mt-1 text-xs text-[var(--muted)]">対応: PNG / JPEG など</span>
              {ocrBusy && ocrProgress && (
                <p className="mt-2 text-xs text-[var(--quiz-accent-bright)]">
                  認識中… {ocrProgress.current} / {ocrProgress.total} 枚
                </p>
              )}
              <input
                ref={bulkFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={ocrBusy}
                onChange={(e) => {
                  void runOcrFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        )}

        {editing && (
          <div className="mb-8 space-y-4 rounded-xl border border-[var(--quiz-border)] p-4">
            <label className="block text-xs text-[var(--muted)]">
              問題文
              <textarea
                className="mt-1 min-h-[100px] w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              />
            </label>

            <div>
              <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-[var(--foreground)]">
                <input
                  type="checkbox"
                  className="size-4 rounded border-[var(--border)] accent-[var(--accent)]"
                  checked={ocrMergeMulti}
                  onChange={(e) => setOcrMergeMulti(e.target.checked)}
                />
                <span>
                  複数画像を 1 問にまとめて認識（オフのときは 1 枚 = 1 問。2
                  枚目以降は自動で別問題として保存）
                </span>
              </label>

              <p className="text-xs text-[var(--muted)]">画像 OCR（PNG / JPEG など・複数枚可）</p>
              <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]/90">
                オフのときは各画像を別問題にします。長い問題だけ画面分割したい場合などに「まとめる」をオンにしてください。
              </p>

              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOver(false);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(false);
                  void runOcrFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                  dragOver
                    ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                    : 'border-[var(--border)] bg-[var(--background)]/30 hover:border-[var(--border-strong)] hover:bg-[var(--background)]/50'
                } ${ocrBusy ? 'pointer-events-none opacity-60' : ''}`}
              >
                <span className="text-sm text-[var(--foreground)]">
                  ここに画像をドラッグ＆ドロップ
                </span>
                <span className="mt-1 text-xs text-[var(--muted)]">
                  またはクリックでファイル選択（複数選択可）
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={ocrBusy}
                  onChange={(e) => {
                    void runOcrFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>

              {ocrBusy && (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {ocrProgress
                    ? `認識中… ${ocrProgress.current} / ${ocrProgress.total} 枚目（初回はモデル取得に時間がかかります）`
                    : '準備中…'}
                </p>
              )}
            </div>

            {QUIZ_CHOICE_LABELS.map((label) => {
              const idx = editing.choices.findIndex((c) => c.label === label);
              const row =
                idx >= 0
                  ? editing.choices[idx]
                  : {
                      id: `c-${label}-${crypto.randomUUID().slice(0, 6)}`,
                      label,
                      body: '',
                      isCorrect: false,
                    };

              return (
                <div
                  key={label}
                  className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border)]/60 p-3"
                >
                  <label className="min-w-0 flex-1 text-xs text-[var(--muted)]">
                    選択肢 {label}
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                      value={row.body}
                      onChange={(e) => {
                        const next = [...editing.choices];
                        const j = next.findIndex((c) => c.label === label);

                        if (j >= 0) {
                          next[j] = { ...next[j], body: e.target.value };
                        } else {
                          next.push({
                            id: row.id,
                            label,
                            body: e.target.value,
                            isCorrect: row.isCorrect,
                          });
                        }

                        setEditing({ ...editing, choices: next });
                      }}
                    />
                  </label>

                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-[var(--border)] accent-[var(--accent)]"
                      checked={row.isCorrect}
                      onChange={(e) => {
                        const next = [...editing.choices];
                        const j = next.findIndex((c) => c.label === label);

                        if (j >= 0) {
                          next[j] = { ...next[j], isCorrect: e.target.checked };
                        } else {
                          next.push({
                            id: row.id,
                            label,
                            body: row.body,
                            isCorrect: e.target.checked,
                          });
                        }

                        setEditing({ ...editing, choices: next });
                      }}
                    />
                    正解
                  </label>
                </div>
              );
            })}

            <label className="block text-xs text-[var(--muted)]">
              解説
              <textarea
                className="mt-1 min-h-[80px] w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                value={editing.explanation}
                onChange={(e) => setEditing({ ...editing, explanation: e.target.value })}
              />
            </label>

            <label className="block text-xs text-[var(--muted)]">
              難易度 1〜5
              <input
                type="range"
                min={1}
                max={5}
                className="mt-1 w-full"
                value={editing.difficulty}
                onChange={(e) => {
                  const n = Math.min(5, Math.max(1, Number(e.target.value) || 1));
                  setEditing({
                    ...editing,
                    difficulty: n as QuizQuestion['difficulty'],
                  });
                }}
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--quiz-on-accent)]"
                onClick={onSaveQuestion}
              >
                保存
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
                onClick={() => setEditing(null)}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {!chapterId ? (
          <p className="text-sm text-[var(--muted)]">チャプターを選択してください。</p>
        ) : (
          <>
            <h3 className="mb-2 text-xs font-medium text-[var(--muted)]">
              登録済み一覧（このチャプター · {questionsInChapter.length} 問）
            </h3>
            <ul className="max-h-[min(60vh,840px)] space-y-2 overflow-y-auto rounded-xl border border-[var(--border)]/60 bg-[var(--background)]/30 p-2">
              {questionsInChapter.map((q) => (
                <li
                  key={q.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)]/60 px-3 py-2 text-sm"
                >
                  <span className="line-clamp-2 text-[var(--foreground)]">
                    {q.body || '(無題)'}
                  </span>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className="text-[var(--quiz-accent-bright)]"
                      onClick={() => setEditing({ ...q, chapterId })}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="text-[var(--quiz-wrong)]"
                      onClick={() => {
                        void (async () => {
                          if (!confirm('削除しますか？')) return;
                          try {
                            await deleteQuestion(q.id);
                            if (editing?.id === q.id) {
                              setEditing(null);
                            }
                            await refresh();
                          } catch {
                            setMsg('削除に失敗しました');
                          }
                        })();
                      }}
                    >
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="quiz-admin-section">
        <h2 className="mb-5 text-[15px] font-semibold text-[var(--foreground)]">
          JSON のバックアップと取り込み
        </h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex flex-col rounded-xl border border-[var(--quiz-card-border)] bg-[var(--quiz-card-bg)]/35 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">書き出し</h3>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[var(--muted)]">
              DB の大分類・チャプター・問題を 1 つの JSON にまとめて保存します。
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-lg border border-[var(--quiz-card-border)] bg-[var(--quiz-choice-bg)]/50 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--quiz-choice-bg)]/80"
              onClick={() => {
                void (async () => {
                  try {
                    const s = await loadStore();
                    const blob = new Blob([exportJson(s)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `quiz-backup-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch {
                    setMsg(QUIZ_ADMIN_MSG.exportFailed);
                  }
                })();
              }}
            >
              JSON をダウンロード
            </button>
          </div>

          <div className="flex flex-col rounded-xl border border-[var(--quiz-card-border)] bg-[var(--quiz-card-bg)]/35 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">取り込み</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
              貼り付け・ファイル・ドロップ。緑の行で形式OK。よく使うのは「既存のまま取り込む」です。
            </p>

            <input
              ref={jsonImportFileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => setImportText(String(reader.result ?? ''));
                reader.readAsText(f);
              }}
            />

            <div
              className={`mt-3 rounded-lg border border-dashed px-2 py-2 transition-colors ${
                dragOverJson
                  ? 'border-[var(--quiz-accent)] bg-[var(--quiz-accent-dim)]'
                  : 'border-[var(--quiz-card-border)]'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverJson(true);
              }}
              onDragLeave={() => setDragOverJson(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverJson(false);
                const f = e.dataTransfer.files?.[0];
                if (!f || (!f.name.toLowerCase().endsWith('.json') && f.type !== 'application/json')) {
                  setImportActionFeedback({
                    kind: 'error',
                    text: 'JSON ファイル（.json）をドロップしてください',
                  });
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => setImportText(String(reader.result ?? ''));
                reader.readAsText(f);
              }}
            >
              <textarea
                className="min-h-[160px] w-full rounded-md border border-[var(--quiz-card-border)] bg-[var(--quiz-choice-bg)]/80 px-3 py-2 font-mono text-[13px] leading-relaxed text-[var(--foreground)]"
                placeholder="JSON を貼る / ドロップ / 下のボタンでファイル選択"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                spellCheck={false}
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--foreground)]"
                onClick={() => jsonImportFileRef.current?.click()}
              >
                ファイルから読み込む
              </button>
            </div>

            {importLint && (
              <p
                className={`mt-2 text-xs font-medium ${importLint.ok ? 'text-[var(--quiz-correct)]' : 'text-[var(--quiz-wrong)]'}`}
                role={importLint.ok ? 'status' : 'alert'}
              >
                {importLint.ok
                  ? `形式チェックOK — 大分類 ${importLint.store.sections.length} 件・チャプター ${importLint.store.chapters.length} 件・問題 ${importLint.store.questions.length} 件`
                  : importLint.error}
              </p>
            )}

            {importLint?.ok && (
              <QuizImportStorePreview
                store={importLint.store}
                heading="取り込み前の確認（問題・選択肢・正解・解説）"
              />
            )}

            <p className="mt-3 text-xs font-medium text-[var(--foreground)]">操作</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={importJsonDisabled}
                title="DB は変更しません。サーバーで再チェックしたうえで件数を表示します。"
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-40"
                onClick={() => void runQuizJsonImport(true, 'merge')}
              >
                件数だけ確認
              </button>
              <button
                type="button"
                disabled={importJsonDisabled}
                title="既存は残し、同じ ID は上書き"
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--quiz-on-accent)] disabled:opacity-40"
                onClick={() => void runQuizJsonImport(false, 'merge')}
              >
                既存のまま取り込む
              </button>
              <button
                type="button"
                disabled={importJsonDisabled}
                title="全削除のうえこの JSON のみ"
                className="rounded-lg border border-[var(--quiz-wrong)] px-4 py-2 text-sm text-[var(--quiz-wrong)] disabled:opacity-40"
                onClick={() => {
                  if (
                    !confirm(
                      '今あるクイズ（大分類・チャプター・問題）をすべて削除してから、この JSON だけに差し替えます。本当によろしいですか？',
                    )
                  ) {
                    return;
                  }
                  void runQuizJsonImport(false, 'replace');
                }}
              >
                全部消して入れ替え
              </button>
            </div>

            <div ref={importFeedbackRef} className="min-h-0">
              {importActionFeedback && (
                <p
                  role={importActionFeedback.kind === 'error' ? 'alert' : 'status'}
                  className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                    importActionFeedback.kind === 'error'
                      ? 'border-[var(--quiz-wrong)]/50 bg-[var(--quiz-wrong)]/10 text-[var(--quiz-wrong)]'
                      : 'border-[var(--quiz-correct)]/40 bg-[var(--quiz-correct)]/10 text-[var(--foreground)]'
                  }`}
                >
                  {importActionFeedback.text}
                </p>
              )}
            </div>

            {importPostSaveStore && (
              <QuizImportStorePreview
                store={importPostSaveStore}
                heading="取り込み完了 — 直前に保存した内容の確認"
                onDismiss={() => setImportPostSaveStore(null)}
              />
            )}
          </div>
        </div>
      </section>

      <section className="quiz-admin-section">
        <h2 className="mb-4 text-[15px] font-semibold text-[var(--foreground)]">
          一括インポート（CSV / Markdown）
        </h2>
        <p className="mb-3 text-[13px] leading-relaxed text-[var(--muted)]">
          保存先チャプターを上で選んでからファイルを選んでください。
        </p>

        <div className="mb-3 flex gap-2 border-b border-[var(--border)] pb-2">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm ${
              bulkTab === 'csv'
                ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                : 'text-[var(--muted)]'
            }`}
            onClick={() => setBulkTab('csv')}
          >
            CSV
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm ${
              bulkTab === 'md'
                ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                : 'text-[var(--muted)]'
            }`}
            onClick={() => setBulkTab('md')}
          >
            Markdown
          </button>
        </div>

        <button
          type="button"
          disabled={!chapterId || bulkBusy}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-40"
          onClick={() => {
            if (bulkTab === 'csv') {
              csvInputRef.current?.click();
            } else {
              mdInputRef.current?.click();
            }
          }}
        >
          {bulkTab === 'csv' ? 'CSV ファイルを選択' : 'Markdown ファイルを選択'}
        </button>

        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f || !chapterId) return;

            setBulkBusy(true);
            void (async () => {
              try {
                await importCsvFile(chapterId, f);
                await refresh();
                setMsg('CSV を取り込みました');
              } catch {
                setMsg('CSV 取り込みに失敗しました');
              } finally {
                setBulkBusy(false);
              }
            })();
          }}
        />

        <input
          ref={mdInputRef}
          type="file"
          accept=".md,.markdown,text/markdown"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f || !chapterId) return;

            setBulkBusy(true);
            void (async () => {
              try {
                await importMarkdownFile(chapterId, f);
                await refresh();
                setMsg('Markdown を取り込みました');
              } catch {
                setMsg('Markdown 取り込みに失敗しました');
              } finally {
                setBulkBusy(false);
              }
            })();
          }}
        />
      </section>
      </div>
    </div>
  );
}
