import type { AnswerResult, QuizStats } from '../types';
import { quizFetch } from './client';

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
