package com.kairos.quiz.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * セクション配下の章。テーブル {@code quiz_chapter}。
 */
@Entity
@Table(name = "quiz_chapter")
@Getter
@Setter
@NoArgsConstructor
public class QuizChapterEntity {

	@Id
	@Column(length = 64)
	private String id;

	@Column(name = "section_id", length = 64, nullable = false)
	private String sectionId;

	@Column(length = 512, nullable = false)
	private String title;

	@Column(name = "sort_order", nullable = false)
	private int sortOrder;
}
