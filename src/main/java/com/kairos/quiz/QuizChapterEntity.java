package com.kairos.quiz;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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

	private String title;

	@Column(name = "sort_order", nullable = false)
	private int sortOrder;
}
