package com.kairos.quiz.dto;

/**
 * JSON ストアの一括取り込み。POST {@code /api/quiz/import}。
 *
 * @param store    取り込むストア（必須）
 * @param dryRun   {@code true} のとき DB を書き換えず件数プレビューのみ
 * @param strategy {@code replace}（全消し→投入）または {@code merge}（ID で上書き／追加）
 */
public record QuizImportRequest(
		QuizStoreDto store,
		boolean dryRun,
		String strategy
) {
}
