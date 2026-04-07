package com.kairos.quiz.dto;

/**
 * 1 問の選択肢。ラベルは通常 A–E。DB は {@code quiz_choice}。
 *
 * @param id        選択肢 ID（省略時はサーバー採番）
 * @param label     表示ラベル（1 文字想定）
 * @param body      選択肢本文
 * @param imageUrl  図版 URL（任意）
 * @param isCorrect 正解かどうか（単一／複数選択は問題側 {@code questionType} と整合させる）
 */
public record ChoiceDto(
		String id,
		String label,
		String body,
		String imageUrl,
		boolean isCorrect
) {
}
