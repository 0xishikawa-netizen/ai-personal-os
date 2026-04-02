'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QuizChapter, QuizQuestion, QuizSection, QuizStore } from '@/lib/quiz/types';
import { parseOcrTextToDraft } from '@/lib/quiz/ocr';
import {
  addChapter,
  addSection,
  deleteChapter,
  deleteQuestion,
  deleteSection,
  exportJson,
  getChaptersBySection,
  importAndSave,
  loadStore,
  upsertQuestion,
} from '@/lib/quiz/storage';

const LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

function emptyQuestion(chapterId: string): QuizQuestion {
  return {
    id: `q-${crypto.randomUUID().slice(0, 8)}`,
    chapterId,
    question: '',
    choices: LABELS.map((label) => ({ label, text: '' })),
    answers: ['A'],
    explanation: '',
    difficulty: 2,
  };
}

/** OCR 下書きが十分なら新規問題に変換（不足なら null） */
function questionFromOcrDraft(
  chapterId: string,
  draft: ReturnType<typeof parseOcrTextToDraft>,
): QuizQuestion | null {
  const choices = LABELS.map((label) => {
    const found = draft.choices.find((c) => c.label === label);
    return { label, text: found?.text ?? '' };
  });
  const filled = choices.filter((c) => c.text.trim());
  if (filled.length < 2 || !draft.question.trim()) return null;
  return {
    id: `q-${crypto.randomUUID().slice(0, 8)}`,
    chapterId,
    question: draft.question.trim(),
    choices: filled,
    answers: ['A'],
    explanation: '',
    difficulty: 2,
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
  /** 複数画像を1問にまとめる（オフ＝1枚1問で一括追加） */
  const [ocrMergeMulti, setOcrMergeMulti] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState('');

  const refresh = useCallback(async () => {
    setBootError(null);
    try {
      const s = await loadStore();
      setStore(s);
    } catch {
      setStore(null);
      setBootError(
        'PostgreSQL 上のクイズデータを読み込めませんでした。API（例: localhost:8080）と DB が起動しているか確認してください。',
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sections = store?.sections.slice().sort((a, b) => a.order - b.order) ?? [];
  const chapters = useMemo(() => {
    if (!store || !sectionId) return [];
    return getChaptersBySection(store, sectionId);
  }, [store, sectionId]);

  const questionsInChapter = useMemo(() => {
    if (!store || !chapterId) return [];
    return store.questions.filter((q) => q.chapterId === chapterId);
  }, [store, chapterId]);

  const onSaveQuestion = async () => {
    if (!editing) return;
    const filled = editing.choices.filter((c) => c.text.trim());
    if (filled.length < 2) {
      setMsg('選択肢は2つ以上入力してください');
      return;
    }
    if (editing.answers.length < 1) {
      setMsg('正解を1つ以上選んでください');
      return;
    }
    const labelsWithText = new Set(filled.map((c) => c.label));
    const answers = [...new Set(editing.answers)].filter((l) => labelsWithText.has(l)).sort();
    if (answers.length < 1) {
      setMsg('正解は入力済みの選択肢のラベルから選んでください');
      return;
    }
    const q = {
      ...editing,
      choices: filled,
      answers,
    };
    try {
      await upsertQuestion(q);
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
      if (draft.question) next.question = draft.question;
      if (draft.choices.length >= 2) {
        next.choices = LABELS.map((label) => {
          const found = draft.choices.find((c) => c.label === label);
          return { label, text: found?.text ?? '' };
        });
      }
      return next;
    });
  }, []);

  /**
   * 画像 OCR。1枚＋フォームあり→下書き反映。
   * 複数枚＋「1問にまとめる」→結合してフォームへ。
   * それ以外の複数枚→1枚ずつパースし 1枚=1問（先頭は開いていればフォームへ、残りはチャプターに追加）。
   * 1枚のみ・フォームなし→チャプターがあればそのまま1問追加。
   */
  const runOcrFiles = async (files: FileList | File[] | null) => {
    const list = files ? Array.from(files) : [];
    const imageFiles = list.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const nPre = imageFiles.length;
    if (nPre > 1 && !(editing && ocrMergeMulti) && !chapterId) {
      setMsg('1 枚=1 問で一括取り込みするには、先にチャプターを選んでください。');
      return;
    }
    if (nPre === 1 && !editing && !chapterId) {
      setMsg('フォームを開くか、チャプターを選んでから画像をドロップしてください。');
      return;
    }

    setOcrBusy(true);
    setOcrProgress({ current: 0, total: imageFiles.length });
    setMsg('');
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('jpn+eng');
      const parts: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        setOcrProgress({ current: i + 1, total: imageFiles.length });
        const {
          data: { text },
        } = await worker.recognize(imageFiles[i]);
        parts.push(text.trim());
      }
      await worker.terminate();
      setOcrProgress(null);

      const n = imageFiles.length;

      if (n === 1) {
        const draft = parseOcrTextToDraft(parts[0] ?? '');
        if (editing) {
          applyDraftToEditing(draft);
          setMsg('1 枚を OCR しました。内容を確認してください。');
        } else if (chapterId) {
          const q = questionFromOcrDraft(chapterId, draft);
          if (q) {
            try {
              await upsertQuestion(q);
              await refresh();
              setMsg('1 問を OCR から追加しました。登録済み一覧で確認・編集できます。');
            } catch {
              setMsg('問題の保存に失敗しました');
            }
          } else {
            setMsg('本文・選択肢を十分に認識できませんでした。画質を確認するか手入力してください。');
          }
        } else {
          setMsg('フォームを開くか、チャプターを選んでからもう一度お試しください。');
        }
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

      const drafts = parts.map((t) => parseOcrTextToDraft(t));
      let added = 0;
      let skipped = 0;

      if (editing) {
        if (drafts[0]) applyDraftToEditing(drafts[0]);
        for (let i = 1; i < drafts.length; i++) {
          const q = questionFromOcrDraft(chapterId, drafts[i]!);
          if (q) {
            try {
              await upsertQuestion(q);
              added += 1;
            } catch {
              skipped += 1;
            }
          } else {
            skipped += 1;
          }
        }
        await refresh();
        setMsg(
          `先頭をフォームに反映し、追加で ${added} 問を保存しました。${skipped ? `（${skipped} 枚は内容不足または保存失敗でスキップ）` : ''}`,
        );
        return;
      }

      for (const d of drafts) {
        const q = questionFromOcrDraft(chapterId, d);
        if (q) {
          try {
            await upsertQuestion(q);
            added += 1;
          } catch {
            skipped += 1;
          }
        } else {
          skipped += 1;
        }
      }
      await refresh();
      setMsg(
        `${added} 問を一括で追加しました。${skipped ? `（${skipped} 枚は内容不足でスキップ）` : ''} 一覧から正解・解説を整えてください。`,
      );
    } catch {
      setMsg('OCR に失敗しました。');
      setOcrProgress(null);
    } finally {
      setOcrBusy(false);
    }
  };

  if (!store) {
    return (
      <div className="quiz-theme space-y-3 p-4 text-[var(--muted)]">
        <p>{bootError ?? '読み込み中…'}</p>
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
    <div className="quiz-theme flex min-h-0 flex-1 flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--quiz-accent)]">管理</p>
        <h1 className="mt-1 text-xl font-semibold text-[var(--foreground)]">問題の登録・編集</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          問題データは PostgreSQL（API 経由）に保存されます。画像はブラウザ内 OCR（Tesseract）で下書きに流し込みます。
        </p>
      </header>

      {msg && (
        <p className="rounded-lg border border-[var(--quiz-border)] bg-[var(--quiz-accent-dim)] px-4 py-2 text-sm text-[var(--quiz-accent-bright)]">
          {msg}
        </p>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/40 p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">セクション</h2>
        <div className="flex flex-wrap gap-2">
          {sections.map((s: QuizSection) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSectionId(s.id);
                setChapterId('');
              }}
              className={`rounded-lg border px-3 py-2 text-sm ${
                sectionId === s.id
                  ? 'border-[var(--quiz-accent)] bg-[var(--quiz-accent-dim)] text-[var(--quiz-accent-bright)]'
                  : 'border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="min-w-[200px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
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

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/40 p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">チャプター</h2>
        <div className="flex flex-wrap gap-2">
          {chapters.map((c: QuizChapter) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setChapterId(c.id)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                chapterId === c.id
                  ? 'border-[var(--quiz-accent)] bg-[var(--quiz-accent-dim)] text-[var(--quiz-accent-bright)]'
                  : 'border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="min-w-[200px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
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

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/40 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">問題の編集</h2>
          <button
            type="button"
            disabled={!chapterId}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--quiz-on-accent)] disabled:opacity-40"
            onClick={() => {
              if (!chapterId) return;
              setEditing(emptyQuestion(chapterId));
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
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverBulk(false);
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
              <span className="text-sm text-[var(--foreground)]">画像を複数枚ドロップ（またはクリック）</span>
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
                value={editing.question}
                onChange={(e) => setEditing({ ...editing, question: e.target.value })}
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
                <span>複数画像を 1 問にまとめて認識（オフのときは 1 枚 = 1 問。2 枚目以降は自動で別問題として保存）</span>
              </label>
              <p className="text-xs text-[var(--muted)]">
                画像 OCR（PNG / JPEG など・複数枚可）
              </p>
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
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
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
            {LABELS.map((label, i) => (
              <label key={label} className="block text-xs text-[var(--muted)]">
                選択肢 {label}
                <input
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  value={editing.choices[i]?.text ?? ''}
                  onChange={(e) => {
                    const choices = editing.choices.map((c, j) =>
                      j === i ? { ...c, text: e.target.value } : c,
                    );
                    setEditing({ ...editing, choices });
                  }}
                />
              </label>
            ))}
            <div className="block text-xs text-[var(--muted)]">
              <p>正解（複数可）</p>
              <div className="mt-2 flex flex-wrap gap-4">
                {LABELS.map((l) => (
                  <label key={l} className="flex cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-[var(--border)] accent-[var(--accent)]"
                      checked={editing.answers.includes(l)}
                      onChange={() => {
                        const set = new Set(editing.answers);
                        if (set.has(l)) {
                          if (set.size <= 1) return;
                          set.delete(l);
                        } else {
                          set.add(l);
                        }
                        setEditing({ ...editing, answers: [...set].sort() });
                      }}
                    />
                    <span>{l}</span>
                  </label>
                ))}
              </div>
            </div>
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
                onChange={(e) => setEditing({ ...editing, difficulty: Number(e.target.value) })}
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

        <h3 className="mb-2 text-xs font-medium text-[var(--muted)]">登録済み（このチャプター）</h3>
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {questionsInChapter.map((q) => (
            <li
              key={q.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)]/60 px-3 py-2 text-sm"
            >
              <span className="line-clamp-2 text-[var(--foreground)]">{q.question || '(無題)'}</span>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="text-[var(--quiz-accent-bright)]"
                  onClick={() => setEditing({ ...q })}
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
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/40 p-5">
        <h2 className="mb-2 text-sm font-semibold text-[var(--foreground)]">バックアップ</h2>
        <button
          type="button"
          className="mb-4 rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
          onClick={() => {
            void (async () => {
              try {
                const s = await loadStore();
                const blob = new Blob([exportJson(s)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `quiz-backup-${Date.now()}.json`;
                a.click();
              } catch {
                setMsg('エクスポートに失敗しました');
              }
            })();
          }}
        >
          JSON をダウンロード
        </button>
        <textarea
          className="mb-2 min-h-[120px] w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-xs"
          placeholder="JSON を貼り付けてインポート"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <button
          type="button"
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--quiz-on-accent)]"
          onClick={() => {
            void (async () => {
              try {
                if (await importAndSave(importText)) {
                  setImportText('');
                  await refresh();
                  setMsg('DB にインポートしました（既存データは置き換え）');
                } else {
                  setMsg('JSON が不正です');
                }
              } catch {
                setMsg('インポートに失敗しました');
              }
            })();
          }}
        >
          インポート
        </button>
      </section>
    </div>
  );
}
