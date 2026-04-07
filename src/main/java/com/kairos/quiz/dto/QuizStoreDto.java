package com.kairos.quiz.dto;

import java.util.List;

/**
 * セクション・章・問題をまとめたストア全体。GET {@code /api/quiz/store} や JSON インポートの本体。
 *
 * @param sections 大分類一覧（並びは {@code order}）
 * @param chapters 章一覧
 * @param questions 全問題（選択肢・タグを含む）
 */
public record QuizStoreDto(
		List<QuizSectionDto> sections,
		List<QuizChapterDto> chapters,
		List<QuizQuestionDto> questions
) {
}
