import { quizFetch } from './client';
import { normalizeStore } from './normalize';
import type { QuizStore } from '../types';

export async function loadStore(): Promise<QuizStore> {
  const res = await quizFetch('/store');
  if (!res.ok) {
    const text = await res.text();
    let detail = text.slice(0, 400);
    try {
      const j = JSON.parse(text) as { message?: string; detail?: string };
      if (typeof j?.message === 'string' && j.message.trim()) {
        detail = j.message.trim();
        if (typeof j?.detail === 'string' && j.detail.trim()) {
          detail += ` (${j.detail.trim()})`;
        }
      }
    } catch {
      /* 生テキスト */
    }
    throw new Error(`quiz store: HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
  }
  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    throw new Error(
      `quiz store: レスポンスの JSON が読めません（${hint}）。プロキシの gzip ヘッダ不整合の可能性があるためフロントを最新にしてください。`,
    );
  }
  return normalizeStore(data);
}
