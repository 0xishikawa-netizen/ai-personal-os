package com.kairos.quiz.dto;

import java.time.Instant;
import java.util.List;

/**
 * 問題の API 表現。本文は JSON では {@code body}、永続化では {@code quiz_question.question} 列。
 *
 * @param id            問題 ID
 * @param chapterId     所属章 ID
 * @param body          問題文
 * @param explanation   解説（任意）
 * @param difficulty    難易度 1–5
 * @param questionType  {@code single} または {@code multiple}
 * @param sortOrder     章内の並び
 * @param imageUrl      問題用画像 URL（任意）
 * @param choices       選択肢一覧
 * @param tags          タグ一覧
 * @param createdAt     作成日時（読取専用、レスポンスで返す）
 * @param updatedAt     更新日時（読取専用）
 */
public record QuizQuestionDto(
		String id,
		String chapterId,
		String body,
		String explanation,
		int difficulty,
		String questionType,
		int sortOrder,
		String imageUrl,
		List<ChoiceDto> choices,
		List<QuizTagDto> tags,
		Instant createdAt,
		Instant updatedAt
) {
}
