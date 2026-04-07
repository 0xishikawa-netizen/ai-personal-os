/** クイズ選択肢ラベル（API / DB と一致） */
export const QUIZ_CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;
export type QuizChoiceLetter = (typeof QUIZ_CHOICE_LABELS)[number];

/** 旧形式インポートの正解ラベル検証用 */
export const QUIZ_IMPORT_ANSWER_LABEL_RE = /^[A-E]$/;
