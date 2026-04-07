package com.kairos.quiz.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 大分類（セクション）。DB は {@code quiz_section}。
 * {@code memo} は学習用メモ（Markdown 想定）。空は JSON から省略（{@link JsonInclude}）。
 * <p>
 * JSON の並びキーは {@code order}（フロント互換）。Java 側コンポーネント名は {@code sortOrder} とし、
 * Jackson のメタデータ用語 {@code order} との衝突を避ける。
 *
 * @param id          クライアント生成またはサーバー採番の ID
 * @param name        表示名
 * @param description 説明（任意）
 * @param sortOrder   並び順（JSON では {@code order}、DB は {@code sort_order}）
 * @param memo        大分類メモ（任意、長文可）
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record QuizSectionDto(
		String id,
		String name,
		String description,
		@JsonProperty("order") int sortOrder,
		String memo
) {
}
