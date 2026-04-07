import type { QuizSection } from '../types';
import { quizFetch } from './client';
import { sectionFromApi } from './normalize';

export async function addSection(
  name: string,
  description?: string,
  memo?: string,
): Promise<QuizSection> {
  const res = await quizFetch('/sections', {
    method: 'POST',
    body: JSON.stringify({ name, description, memo }),
  });
  if (!res.ok) throw new Error(`addSection: ${res.status}`);
  const o = (await res.json()) as Record<string, unknown>;
  return sectionFromApi(o);
}

export async function updateSection(
  id: string,
  patch: Partial<Pick<QuizSection, 'name' | 'description' | 'order' | 'memo'>>,
): Promise<QuizSection> {
  const res = await quizFetch(`/sections/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    let detail = `セクション更新に失敗しました (HTTP ${res.status})`;
    const errText = await res.text();
    try {
      const j = JSON.parse(errText) as { message?: string };
      if (typeof j?.message === 'string' && j.message.trim()) {
        detail = j.message.trim();
      }
    } catch {
      if (errText && errText.length < 400) detail = errText.trim();
    }
    throw new Error(detail);
  }
  const o = (await res.json()) as Record<string, unknown>;
  return sectionFromApi(o);
}

export async function deleteSection(id: string): Promise<void> {
  const res = await quizFetch(`/sections/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`deleteSection: ${res.status}`);
}
