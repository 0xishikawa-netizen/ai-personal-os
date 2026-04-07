import type { QuizQuestion } from '../types';
import { quizApiBaseUrl, quizFetch } from './client';
import { normalizeQuestion } from './normalize';

export async function listQuestionsByChapter(chapterId: string): Promise<QuizQuestion[]> {
  const res = await quizFetch(`/questions?chapterId=${encodeURIComponent(chapterId)}`);
  if (!res.ok) throw new Error(`questions: ${res.status}`);
  const arr = (await res.json()) as Record<string, unknown>[];
  return arr.map((q) => normalizeQuestion(q));
}

export function toQuestionPayload(q: QuizQuestion): Record<string, unknown> {
  return {
    id: q.id || undefined,
    chapterId: q.chapterId,
    body: q.body,
    explanation: q.explanation ?? '',
    difficulty: q.difficulty,
    questionType: q.questionType,
    sortOrder: q.sortOrder,
    imageUrl: q.imageUrl,
    choices: q.choices.map((c) => ({
      id: c.id?.startsWith('c-') && c.id.length < 20 ? c.id : c.id,
      label: c.label,
      body: c.body,
      imageUrl: c.imageUrl,
      isCorrect: c.isCorrect,
    })),
    tags: q.tags ?? [],
  };
}

export async function createQuestion(q: QuizQuestion): Promise<void> {
  const res = await quizFetch('/questions', {
    method: 'POST',
    body: JSON.stringify(toQuestionPayload(q)),
  });
  if (!res.ok) throw new Error(`createQuestion: ${res.status}`);
}

export async function updateQuestion(id: string, q: QuizQuestion): Promise<void> {
  const res = await quizFetch(`/questions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(toQuestionPayload({ ...q, id })),
  });
  if (!res.ok) throw new Error(`updateQuestion: ${res.status}`);
}

export async function saveQuestion(q: QuizQuestion): Promise<void> {
  if (q.createdAt) {
    await updateQuestion(q.id, q);
    return;
  }
  await createQuestion(q);
}

export async function deleteQuestion(id: string): Promise<void> {
  const res = await quizFetch(`/questions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`deleteQuestion: ${res.status}`);
}

export async function importCsvFile(chapterId: string, file: File): Promise<void> {
  const fd = new FormData();
  fd.append('file', file);
  const base = quizApiBaseUrl();
  const res = await fetch(
    `${base}/questions/import/csv?chapterId=${encodeURIComponent(chapterId)}`,
    { method: 'POST', body: fd },
  );
  if (!res.ok) throw new Error(`import csv: ${res.status}`);
}

export async function importMarkdownFile(chapterId: string, file: File): Promise<void> {
  const fd = new FormData();
  fd.append('file', file);
  const base = quizApiBaseUrl();
  const res = await fetch(
    `${base}/questions/import/markdown?chapterId=${encodeURIComponent(chapterId)}`,
    { method: 'POST', body: fd },
  );
  if (!res.ok) throw new Error(`import md: ${res.status}`);
}
