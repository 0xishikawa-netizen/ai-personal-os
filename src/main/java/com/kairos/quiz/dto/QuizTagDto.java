package com.kairos.quiz.dto;

/**
 * 問題に付与するタグ。DB は {@code quiz_tag}、関連は {@code quiz_question_tag}。
 *
 * @param id   既存タグ ID（指定時はそのタグを再利用）
 * @param name タグ名（大文字小文字は保存時に正規化され得る）
 */
public record QuizTagDto(String id, String name) {
}
