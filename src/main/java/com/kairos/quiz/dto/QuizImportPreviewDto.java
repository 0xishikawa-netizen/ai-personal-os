package com.kairos.quiz.dto;

/**
 * インポートのドライラン結果（件数の確認用）。
 *
 * @param sections 取り込み予定のセクション数
 * @param chapters 取り込み予定の章数
 * @param questions 取り込み予定の問題数
 * @param valid    バリデーション通過時 {@code true}
 */
public record QuizImportPreviewDto(int sections, int chapters, int questions, boolean valid) {
}
