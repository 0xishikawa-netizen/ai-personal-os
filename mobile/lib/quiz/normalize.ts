import type { Choice, QuizChapter, QuizQuestion, QuizSection, QuizStore } from './types';

export function normalizeQuestion(raw: Record<string, unknown>): QuizQuestion {
  const choicesRaw = Array.isArray(raw.choices) ? raw.choices : [];
  const choices: Choice[] = choicesRaw.map((c: unknown) => {
    const o = c as Record<string, unknown>;
    return {
      id: String(o.id ?? ''),
      label: String(o.label ?? 'A').toUpperCase().slice(0, 1) as Choice['label'],
      body: String(o.body ?? o.text ?? ''),
      imageUrl: o.imageUrl != null ? String(o.imageUrl) : undefined,
      isCorrect: Boolean(o.isCorrect),
    };
  });
  const body =
    typeof raw.body === 'string'
      ? raw.body
      : typeof raw.question === 'string'
        ? raw.question
        : '';
  const correctCount = choices.filter((c) => c.isCorrect).length;
  const qt = typeof raw.questionType === 'string' ? raw.questionType.toLowerCase() : '';
  const qType: QuizQuestion['questionType'] =
    qt === 'multiple' || correctCount > 1 ? 'multiple' : 'single';
  const diff = Math.min(5, Math.max(1, Number(raw.difficulty) || 1)) as QuizQuestion['difficulty'];
  return {
    id: String(raw.id ?? ''),
    chapterId: String(raw.chapterId ?? ''),
    body,
    explanation: raw.explanation != null ? String(raw.explanation) : undefined,
    difficulty: diff,
    questionType: qType,
    sortOrder: Number(raw.sortOrder) || 0,
    imageUrl: raw.imageUrl != null ? String(raw.imageUrl) : undefined,
    choices,
  };
}

export function normalizeStore(data: Record<string, unknown>): QuizStore {
  const sections = (Array.isArray(data.sections) ? data.sections : []).map((s: unknown) => {
    const o = s as Record<string, unknown>;
    return {
      id: String(o.id),
      name: String(o.name),
      description: o.description != null ? String(o.description) : undefined,
      memo: o.memo != null && String(o.memo).trim() !== '' ? String(o.memo) : undefined,
      order: Number(o.order ?? o.sortOrder) || 0,
    } as QuizSection;
  });
  const chapters = (Array.isArray(data.chapters) ? data.chapters : []).map((c: unknown) => {
    const o = c as Record<string, unknown>;
    return {
      id: String(o.id),
      sectionId: String(o.sectionId),
      title: String(o.title),
      order: Number(o.order ?? o.sortOrder) || 0,
    } as QuizChapter;
  });
  const questions = (Array.isArray(data.questions) ? data.questions : []).map((q) =>
    normalizeQuestion(q as Record<string, unknown>),
  );
  return { sections, chapters, questions };
}
