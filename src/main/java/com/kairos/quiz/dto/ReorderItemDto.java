package com.kairos.quiz.dto;

/**
 * 並び替え API 用の 1 要素。セクション／章／問題の {@code PUT .../reorder} で配列として送る。
 *
 * @param id         対象エンティティ ID
 * @param sortOrder  新しい並び順
 */
public record ReorderItemDto(String id, int sortOrder) {
}
