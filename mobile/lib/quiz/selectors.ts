import type { QuizChapter, QuizSection, QuizStore } from './types';

export function getChaptersBySection(store: QuizStore, sectionId: string): QuizChapter[] {
  return store.chapters.filter((c) => c.sectionId === sectionId).sort((a, b) => a.order - b.order);
}

export function getQuestionsByChapter(store: QuizStore, chapterId: string) {
  return store.questions
    .filter((q) => q.chapterId === chapterId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

export function getSectionForChapter(store: QuizStore, chapterId: string): QuizSection | undefined {
  const ch = store.chapters.find((c) => c.id === chapterId);
  if (!ch) return undefined;
  return store.sections.find((s) => s.id === ch.sectionId);
}

export function questionCountForChapter(store: QuizStore, chapterId: string): number {
  return store.questions.filter((q) => q.chapterId === chapterId).length;
}
