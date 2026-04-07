package com.kairos.quiz.dto;

import java.util.List;

/**
 * 解答送信。POST {@code /api/quiz/answer}。
 *
 * @param userId      ユーザー識別子（統計・履歴のキー）
 * @param questionId  問題 ID
 * @param chosen      選んだラベル一覧（例: {@code ["A","C"]}、大文字小文字はサーバーで正規化）
 * @param timeSpentMs 解答にかかった時間ミリ秒（任意）
 */
public record AnswerSubmitDto(
		String userId,
		String questionId,
		List<String> chosen,
		Integer timeSpentMs
) {
}
