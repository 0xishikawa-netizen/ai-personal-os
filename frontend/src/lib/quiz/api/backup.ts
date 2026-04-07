import type { QuizStore } from '../types';

export function exportJson(store: QuizStore): string {
  return JSON.stringify(store, null, 2);
}
