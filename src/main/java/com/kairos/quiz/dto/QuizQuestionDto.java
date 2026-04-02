package com.kairos.quiz.dto;

import java.util.List;

public record QuizQuestionDto(
		String id,
		String chapterId,
		String question,
		List<QuizChoiceDto> choices,
		List<String> answers,
		String explanation,
		int difficulty
) {
}
