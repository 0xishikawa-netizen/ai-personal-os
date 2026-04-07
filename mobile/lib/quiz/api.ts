import { apiUrl } from '../apiOrigin';
import { normalizeQuestion, normalizeStore } from './normalize';
import type { AnswerResult, QuizQuestion, QuizStats, QuizStore } from './types';

function quizUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return apiUrl(`/api/quiz${p}`);
}

async function quizFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(quizUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

export async function loadStore(): Promise<QuizStore> {
  const res = await quizFetch('/store');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`quiz store: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  return normalizeStore(data);
}

export async function listQuestionsByChapter(chapterId: string): Promise<QuizQuestion[]> {
  const res = await quizFetch(`/questions?chapterId=${encodeURIComponent(chapterId)}`);
  if (!res.ok) throw new Error(`questions: ${res.status}`);
  const arr = (await res.json()) as Record<string, unknown>[];
  return arr.map((q) => normalizeQuestion(q));
}

export async function getStats(userId: string): Promise<QuizStats> {
  const res = await quizFetch(`/stats?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`stats: ${res.status}`);
  return res.json() as Promise<QuizStats>;
}

export async function submitAnswer(payload: {
  userId: string;
  questionId: string;
  chosen: string[];
  timeSpentMs?: number;
}): Promise<AnswerResult> {
  const res = await quizFetch('/answer', {
    method: 'POST',
    body: JSON.stringify({
      userId: payload.userId,
      questionId: payload.questionId,
      chosen: payload.chosen,
      timeSpentMs: payload.timeSpentMs,
    }),
  });
  if (!res.ok) throw new Error(`answer: ${res.status}`);
  return res.json() as Promise<AnswerResult>;
}
