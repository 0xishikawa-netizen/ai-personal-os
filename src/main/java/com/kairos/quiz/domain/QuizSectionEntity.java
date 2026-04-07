package com.kairos.quiz.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * クイズの大分類（セクション）。テーブル {@code quiz_section}。
 */
@Entity
@Table(name = "quiz_section")
@Getter
@Setter
@NoArgsConstructor
public class QuizSectionEntity {

	@Id
	@Column(length = 64)
	private String id;

	@Column(length = 512, nullable = false)
	private String name;

	@Column(columnDefinition = "TEXT")
	private String description;

	/**
	 * 大分類の学習メモ（Markdown 想定）。
	 * DB: {@code quiz_section.memo}（TEXT）。Flyway {@code V5__quiz_section_memo.sql}。
	 */
	@Column(columnDefinition = "TEXT")
	private String memo;

	@Column(name = "sort_order", nullable = false)
	private int sortOrder;
}
