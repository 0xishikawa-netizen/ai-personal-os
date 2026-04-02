package com.kairos.quiz;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "quiz_section")
@Getter
@Setter
@NoArgsConstructor
public class QuizSectionEntity {

	@Id
	@Column(length = 64)
	private String id;

	private String name;

	@Column(columnDefinition = "TEXT")
	private String description;

	@Column(name = "sort_order", nullable = false)
	private int sortOrder;
}
