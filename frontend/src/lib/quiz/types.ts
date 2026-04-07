/** KAIROS QUIZ — セクション → チャプター → 問題（正規化された選択肢） */

export type ChoiceLabel = 'A' | 'B' | 'C' | 'D' | 'E';

export type Choice = {
  id: string;
  label: ChoiceLabel;
  body: string;
  imageUrl?: string;
  isCorrect: boolean;
};

export type QuizTag = { id: string; name: string };

export type QuizQuestion = {
  id: string;
  chapterId: string;
  body: string;
  explanation?: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  questionType: 'single' | 'multiple';
  sortOrder: number;
  imageUrl?: string;
  tags?: QuizTag[];
  choices: Choice[];
  createdAt?: string;
  updatedAt?: string;
};

export type QuizChapter = {
  id: string;
  sectionId: string;
  title: string;
  order: number;
};

export type QuizSection = {
  id: string;
  name: string;
  description?: string;
  /** 大分類の学習メモ（Markdown）。教科書の「本章のポイント」風にホームで表示 */
  memo?: string;
  order: number;
};

export type QuizStore = {
  sections: QuizSection[];
  chapters: QuizChapter[];
  questions: QuizQuestion[];
};

export function correctLabels(q: QuizQuestion): string[] {
  return [...new Set(q.choices.filter((c) => c.isCorrect).map((c) => c.label))].sort();
}

export type AnswerRecord = {
  questionId: string;
  selected: string[];
  correct: boolean;
};

export type SectionResult = {
  sectionId: string;
  sectionName: string;
  correct: number;
  total: number;
};

export type QuizStats = {
  totalQuestions: number;
  answerCount: number;
  accuracyPercent: number;
  streakDays: number;
  weakChapters: {
    chapterId: string;
    sectionId: string;
    title: string;
    accuracyPercent: number;
  }[];
};

export type AnswerResult = {
  isCorrect: boolean;
  correctLabels: string[];
  explanation: string | null;
};
