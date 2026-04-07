package com.kairos.quiz.dto;

import java.util.List;

/**
 * 採点結果。正解ラベルはソート済みで返す（クライアント比較用）。
 *
 * @param isCorrect      完全一致で正解か
 * @param correctLabels  正解となるラベル一覧（大文字）
 * @param explanation    解説（問題に無ければ {@code null}）
 */
public record AnswerResultDto(
		boolean isCorrect,
		List<String> correctLabels,
		String explanation
) {
}
