package com.kairos.quiz.dto;

import java.util.List;

/**
 * ユーザー別の学習統計。GET {@code /api/quiz/stats}。
 *
 * @param totalQuestions   システム全体の問題数
 * @param answerCount      当該ユーザーの解答履歴件数
 * @param accuracyPercent  正答率（0–100）
 * @param streakDays       UTC 日付ベースの連続解答日数
 * @param weakChapters     正答率が低い章のサマリ（件数・閾値はサービス実装に依存）
 */
public record QuizStatsDto(
		long totalQuestions,
		long answerCount,
		double accuracyPercent,
		int streakDays,
		List<WeakChapterDto> weakChapters
) {
}
