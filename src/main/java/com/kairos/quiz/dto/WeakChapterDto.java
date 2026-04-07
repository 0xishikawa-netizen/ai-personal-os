package com.kairos.quiz.dto;

/**
 * 統計上「苦手」と判定された章のスナップショット。
 *
 * @param chapterId         章 ID
 * @param sectionId         所属セクション ID
 * @param title             章タイトル
 * @param accuracyPercent   その章での正答率（0–100）
 */
public record WeakChapterDto(
		String chapterId,
		String sectionId,
		String title,
		double accuracyPercent
) {
}
