import type { QuizChapter } from '../types';
import { quizFetch } from './client';
import { chapterFromApi } from './normalize';

export async function addChapter(sectionId: string, title: string): Promise<QuizChapter> {
  const res = await quizFetch('/chapters', {
    method: 'POST',
    body: JSON.stringify({ sectionId, title }),
  });
  if (!res.ok) throw new Error(`addChapter: ${res.status}`);
  const o = (await res.json()) as Record<string, unknown>;
  return chapterFromApi(o);
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
  const res = await quizFetch(`/chapters/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`deleteChapter: ${res.status}`);
}
