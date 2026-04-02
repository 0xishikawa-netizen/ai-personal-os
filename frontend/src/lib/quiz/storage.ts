import type { QuizChapter, QuizQuestion, QuizSection, QuizStore } from './types';

const LABEL_RE = /^[A-E]$/;

/**
 * クイズ API のベース URL（末尾スラッシュなし）。
 * - `NEXT_PUBLIC_API_BASE_URL` 未設定時は相対パス `/api/quiz`（Next の rewrite → 8080）
 * - 明示設定時は従来どおり直接バックエンドへ
 */
function quizApiOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '').trim();
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') return '';
  return 'http://127.0.0.1:8080';
}

function normalizeAnswerLabels(labels: string[]): string[] {
  return [
    ...new Set(
      labels
        .map((x) => String(x).toUpperCase())
        .filter((x) => LABEL_RE.test(x)),
    ),
  ].sort();
}

/** 旧 answer: string を answers に統一（JSON インポート用） */
export function normalizeQuestion(
  q: QuizQuestion & { answer?: string },
): QuizQuestion {
  const o = q as QuizQuestion & { answer?: string };
  let answers: string[] = [];
  if (Array.isArray(o.answers) && o.answers.length > 0) {
    answers = normalizeAnswerLabels(o.answers);
  } else if (typeof o.answer === 'string' && o.answer) {
    answers = normalizeAnswerLabels([o.answer]);
  }
  if (answers.length === 0) answers = ['A'];
  const { answer: _drop, ...rest } = o;
  return { ...rest, answers };
}

async function quizFetch(path: string, init?: RequestInit): Promise<Response> {
  const origin = quizApiOrigin();
  const url = origin ? `${origin}/api/quiz${path}` : `/api/quiz${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

/** PostgreSQL 上のクイズデータを取得 */
export async function loadStore(): Promise<QuizStore> {
  const res = await quizFetch('/store');
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`quiz store: HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
  }
  return res.json() as Promise<QuizStore>;
}

export function exportJson(store: QuizStore): string {
  return JSON.stringify(store, null, 2);
}

export function importJson(text: string): QuizStore | null {
  try {
    const parsed = JSON.parse(text) as QuizStore;
    if (!parsed.sections || !parsed.chapters || !parsed.questions) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** ローカル JSON を DB に取り込み（既存データは置き換え） */
export async function importAndSave(text: string): Promise<boolean> {
  const s = importJson(text);
  if (!s) return false;
  const normalized: QuizStore = {
    ...s,
    questions: s.questions.map((q) =>
      normalizeQuestion(q as QuizQuestion & { answer?: string }),
    ),
  };
  const res = await quizFetch('/import', {
    method: 'POST',
    body: JSON.stringify(normalized),
  });
  return res.ok;
}

export async function addSection(name: string, description?: string): Promise<QuizSection> {
  const res = await quizFetch('/sections', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error(`addSection: ${res.status}`);
  return res.json() as Promise<QuizSection>;
}

export async function updateSection(
  id: string,
  patch: Partial<Pick<QuizSection, 'name' | 'description' | 'order'>>,
): Promise<void> {
  const res = await quizFetch(`/sections/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`updateSection: ${res.status}`);
}

export async function deleteSection(id: string): Promise<void> {
  const res = await quizFetch(`/sections/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`deleteSection: ${res.status}`);
}

export async function addChapter(sectionId: string, title: string): Promise<QuizChapter> {
  const res = await quizFetch('/chapters', {
    method: 'POST',
    body: JSON.stringify({ sectionId, title }),
  });
  if (!res.ok) throw new Error(`addChapter: ${res.status}`);
  return res.json() as Promise<QuizChapter>;
}

export async function updateChapter(
  id: string,
  patch: Partial<Pick<QuizChapter, 'title' | 'order' | 'sectionId'>>,
): Promise<void> {
  const res = await quizFetch(`/chapters/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`updateChapter: ${res.status}`);
}

export async function deleteChapter(id: string): Promise<void> {
  const res = await quizFetch(`/chapters/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`deleteChapter: ${res.status}`);
}

export async function upsertQuestion(q: QuizQuestion): Promise<void> {
  const res = await quizFetch('/questions', {
    method: 'PUT',
    body: JSON.stringify(q),
  });
  if (!res.ok) throw new Error(`upsertQuestion: ${res.status}`);
}

export async function deleteQuestion(id: string): Promise<void> {
  const res = await quizFetch(`/questions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`deleteQuestion: ${res.status}`);
}

export function getChaptersBySection(store: QuizStore, sectionId: string): QuizChapter[] {
  return store.chapters.filter((c) => c.sectionId === sectionId).sort((a, b) => a.order - b.order);
}

export function getQuestionsByChapter(store: QuizStore, chapterId: string): QuizQuestion[] {
  return store.questions.filter((q) => q.chapterId === chapterId);
}

export function getSectionForChapter(store: QuizStore, chapterId: string): QuizSection | undefined {
  const ch = store.chapters.find((c) => c.id === chapterId);
  if (!ch) return undefined;
  return store.sections.find((s) => s.id === ch.sectionId);
}
