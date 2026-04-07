import { QUIZ_CHOICE_LABELS, QUIZ_IMPORT_ANSWER_LABEL_RE } from '../constants/labels';
import { quizFetch } from '../api/client';
import { normalizeStore } from '../api/normalize';
import type { ChoiceLabel, QuizStore } from '../types';

export type QuizImportParseResult =
  | { ok: true; store: QuizStore }
  | { ok: false; error: string };

export type ImportSaveResult =
  | {
      ok: true;
      preview?: { sections: number; chapters: number; questions: number };
      imported?: { sections: number; chapters: number; questions: number };
    }
  | { ok: false; error: string; code?: string };

function randomIdSuffix(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 10);
  }
  return String(Math.random()).slice(2, 12);
}

function ensureChoiceIds(store: QuizStore): QuizStore {
  return {
    ...store,
    questions: store.questions.map((q) => ({
      ...q,
      choices: q.choices.map((c) => ({
        ...c,
        id: c.id?.trim() ? c.id : `c-${c.label.toLowerCase()}-${randomIdSuffix()}`,
      })),
    })),
  };
}

function isStoreShape(o: Record<string, unknown>): boolean {
  return Array.isArray(o.sections) && Array.isArray(o.chapters) && Array.isArray(o.questions);
}

function extractStoreRoot(
  parsed: unknown,
): { ok: true; root: Record<string, unknown> } | { ok: false; error: string } {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'JSON のルートはオブジェクトである必要があります（配列で始まっていませんか？）' };
  }
  const o = parsed as Record<string, unknown>;
  if (isStoreShape(o)) {
    return { ok: true, root: o };
  }
  const fromStore = o.store;
  if (
    fromStore &&
    typeof fromStore === 'object' &&
    !Array.isArray(fromStore) &&
    isStoreShape(fromStore as Record<string, unknown>)
  ) {
    return { ok: true, root: fromStore as Record<string, unknown> };
  }
  const fromData = o.data;
  if (
    fromData &&
    typeof fromData === 'object' &&
    !Array.isArray(fromData) &&
    isStoreShape(fromData as Record<string, unknown>)
  ) {
    return { ok: true, root: fromData as Record<string, unknown> };
  }
  return {
    ok: false,
    error:
      'sections / chapters / questions が見つかりません。ルートに並べるか、`{ "store": { ... } }` 形式にしてください。',
  };
}

function normalizeLabel(raw: unknown): ChoiceLabel | null {
  const u = String(raw ?? '')
    .trim()
    .toUpperCase()
    .slice(0, 1);
  return (QUIZ_CHOICE_LABELS as readonly string[]).includes(u) ? (u as ChoiceLabel) : null;
}

function validateStoreReferences(store: QuizStore): string | null {
  if (store.sections.length === 0) {
    return 'sections に1件以上の大分類が必要です';
  }
  const seenS = new Set<string>();
  for (const s of store.sections) {
    if (!s.id?.trim()) return '大分類に id がありません';
    if (seenS.has(s.id)) return `大分類 id の重複: ${s.id}`;
    seenS.add(s.id);
    if (!s.name?.trim()) return `大分類 ${s.id}: name が空です`;
  }
  const sectionIds = new Set(store.sections.map((x) => x.id));
  const seenC = new Set<string>();
  const chapterIds = new Set<string>();
  for (const c of store.chapters) {
    if (!c.id?.trim()) return 'チャプターに id がありません';
    if (seenC.has(c.id)) return `チャプター id の重複: ${c.id}`;
    seenC.add(c.id);
    if (!c.title?.trim()) return `チャプター ${c.id}: title が空です`;
    if (!c.sectionId?.trim() || !sectionIds.has(c.sectionId)) {
      return `チャプター「${c.title}」の sectionId（${c.sectionId}）が sections に存在しません`;
    }
    chapterIds.add(c.id);
  }
  const seenQ = new Set<string>();
  for (let i = 0; i < store.questions.length; i++) {
    const q = store.questions[i];
    const n = i + 1;
    if (q.id?.trim() && seenQ.has(q.id)) {
      return `問題 ${n}: 問題 id の重複（${q.id}）`;
    }
    if (q.id?.trim()) seenQ.add(q.id);
    if (!q.chapterId?.trim() || !chapterIds.has(q.chapterId)) {
      return `問題 ${n}: chapterId（${q.chapterId}）が chapters に存在しません`;
    }
    if (!q.body?.trim()) return `問題 ${n}: 問題文（body または question）が空です`;
    const filled = q.choices.filter((ch) => ch.body.trim());
    if (filled.length < 2) return `問題 ${n}: 本文がある選択肢は2個以上必要です`;
    if (!filled.some((ch) => ch.isCorrect)) return `問題 ${n}: 正解（isCorrect: true）が1つ以上必要です`;
    for (let j = 0; j < q.choices.length; j++) {
      const ch = q.choices[j];
      if (!normalizeLabel(ch.label)) {
        return `問題 ${n}: 選択肢 ${j + 1} の label「${ch.label}」は A〜E である必要があります`;
      }
    }
  }
  return null;
}

function normalizeImportedQuestionRow(q: Record<string, unknown>): Record<string, unknown> {
  if (typeof q.body === 'string' && Array.isArray(q.choices)) {
    return q;
  }
  const question = String(q.question ?? '');
  const answers: string[] = Array.isArray(q.answers)
    ? q.answers.map((a) => String(a).toUpperCase())
    : typeof q.answer === 'string'
      ? [q.answer.toUpperCase()]
      : ['A'];
  const labels = QUIZ_CHOICE_LABELS;
  const oldChoices = Array.isArray(q.choices) ? q.choices : [];
  const choices = labels
    .map((lab) => {
      const row = oldChoices.find(
        (c: unknown) => String((c as { label?: string }).label ?? '').toUpperCase() === lab,
      ) as { text?: string; body?: string } | undefined;
      const body = row ? String(row.body ?? row.text ?? '') : '';
      return {
        id: `c-${lab.toLowerCase()}`,
        label: lab,
        body,
        isCorrect: answers.map((a) => a.trim().toUpperCase()).includes(lab),
      };
    })
    .filter((c) => c.body.trim() !== '' || c.isCorrect);
  const filled = choices.filter((c) => c.body.trim());
  const qType =
    answers.filter((a) => QUIZ_IMPORT_ANSWER_LABEL_RE.test(a.trim().toUpperCase())).length > 1
      ? 'multiple'
      : 'single';
  return {
    ...q,
    body: question,
    questionType: qType,
    choices: filled.length >= 2 ? filled : choices.filter((c) => c.body.trim() || c.isCorrect),
    sortOrder: Number(q.sortOrder) || 0,
    difficulty: Math.min(5, Math.max(1, Number(q.difficulty) || 2)),
  };
}

function parseJsonObject(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    return { ok: false, error: 'JSON が空です' };
  }
  try {
    const value: unknown = JSON.parse(trimmed);
    return { ok: true, value };
  } catch (e) {
    const hint = e instanceof SyntaxError && e.message ? `（${e.message}）` : '';
    return { ok: false, error: `JSON の構文が不正です${hint}` };
  }
}

export function parseQuizImportJson(text: string): QuizImportParseResult {
  const parsed = parseJsonObject(text);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const extracted = extractStoreRoot(parsed.value);
  if (!extracted.ok) {
    return { ok: false, error: extracted.error };
  }
  const root = extracted.root;
  const questions = (root.questions as Record<string, unknown>[]).map((q) =>
    normalizeImportedQuestionRow(q),
  );
  const store = normalizeStore({ ...root, questions });
  const err = validateStoreReferences(store);
  if (err) {
    return { ok: false, error: err };
  }
  return { ok: true, store: ensureChoiceIds(store) };
}

export function importJson(text: string): QuizStore | null {
  const r = parseQuizImportJson(text);
  return r.ok ? r.store : null;
}

async function readQuizApiError(res: Response): Promise<{ message: string; code?: string }> {
  const raw = await res.text();
  try {
    const j = JSON.parse(raw) as { code?: string; message?: string };
    const message =
      typeof j?.message === 'string' && j.message.trim() ? j.message.trim() : `HTTP ${res.status}`;
    const code = typeof j?.code === 'string' && j.code.trim() ? j.code.trim() : undefined;
    return { message, code };
  } catch {
    return { message: raw.trim().slice(0, 500) || `HTTP ${res.status}` };
  }
}

function countStorePayload(data: unknown): { sections: number; chapters: number; questions: number } {
  const o = data as { sections?: unknown[]; chapters?: unknown[]; questions?: unknown[] };
  return {
    sections: Array.isArray(o.sections) ? o.sections.length : 0,
    chapters: Array.isArray(o.chapters) ? o.chapters.length : 0,
    questions: Array.isArray(o.questions) ? o.questions.length : 0,
  };
}

export async function importAndSave(
  text: string,
  options?: { dryRun?: boolean; strategy?: 'replace' | 'merge' },
): Promise<ImportSaveResult> {
  const parsed = parseQuizImportJson(text);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const dryRun = options?.dryRun ?? false;
  const strategy = options?.strategy ?? 'replace';
  const res = await quizFetch('/import', {
    method: 'POST',
    body: JSON.stringify({ store: parsed.store, dryRun, strategy }),
  });
  if (!res.ok) {
    const { message, code } = await readQuizApiError(res);
    return { ok: false, error: message, code };
  }
  const raw = await res.text();
  if (dryRun) {
    return {
      ok: true,
      preview: {
        sections: parsed.store.sections.length,
        chapters: parsed.store.chapters.length,
        questions: parsed.store.questions.length,
      },
    };
  }
  let bodyJson: unknown;
  try {
    bodyJson = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'サーバー応答の形式が不正です' };
  }
  return { ok: true, imported: countStorePayload(bodyJson) };
}
