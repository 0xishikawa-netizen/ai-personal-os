package com.kairos.quiz.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 章。DB は {@code quiz_chapter}、{@code sectionId} で大分類に紐づく。
 * JSON の並びキーは {@code order}。Java 側は {@link JsonProperty} で対応（{@link QuizSectionDto} と同様）。
 *
 * @param id        章 ID
 * @param sectionId 所属セクション ID
 * @param title     章タイトル
 * @param sortOrder 同一セクション内の並び（JSON では {@code order}）
 */
public record QuizChapterDto(
		String id,
		String sectionId,
		String title,
		@JsonProperty("order") int sortOrder
) {
}
