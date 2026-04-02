package com.kairos.quiz;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "quiz_question")
@Getter
@Setter
@NoArgsConstructor
public class QuizQuestionEntity {

	@Id
	@Column(length = 64)
	private String id;

	@Column(name = "chapter_id", length = 64, nullable = false)
	private String chapterId;

	@Column(columnDefinition = "TEXT", nullable = false)
	private String question;

	/** JSON: [{ "label": "A", "text": "..." }, ...] */
	@Column(name = "choices_json", columnDefinition = "TEXT", nullable = false)
	private String choicesJson;

	/** JSON: ["A","B"] */
	@Column(name = "answers_json", columnDefinition = "TEXT", nullable = false)
	private String answersJson;

	@Column(columnDefinition = "TEXT")
	private String explanation;

	@Column(nullable = false)
	private int difficulty;
}
