/** 汎用問題集 — 任意の学習ジャンル向け（セクション → チャプター → 問題） */

export type QuizChoice = { label: string; text: string };

export type QuizQuestion = {
  id: string;
  chapterId: string;
  question: string;
  choices: QuizChoice[];
  /** 正解ラベル（例: ['A'] または ['A','D']）。ソート済み・重複なしを前提 */
  answers: string[];
  explanation: string;
  difficulty: number;
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
  order: number;
};

export type QuizStore = {
  sections: QuizSection[];
  chapters: QuizChapter[];
  questions: QuizQuestion[];
};

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
