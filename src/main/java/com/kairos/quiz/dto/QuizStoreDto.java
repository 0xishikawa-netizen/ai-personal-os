package com.kairos.quiz.dto;

import java.util.List;

public record QuizStoreDto(
		List<QuizSectionDto> sections,
		List<QuizChapterDto> chapters,
		List<QuizQuestionDto> questions
) {
}
