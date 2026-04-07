package com.kairos.quiz.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 問題に紐づく選択肢（ラベル A–E）。テーブル {@code quiz_choice}。
 */
@Entity
@Table(name = "quiz_choice")
@Getter
@Setter
@NoArgsConstructor
public class QuizChoiceEntity {

	@Id
	@Column(length = 40)
	private String id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "question_id", nullable = false)
	private QuizQuestionEntity question;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(length = 1, nullable = false)
	private String label;

	@Column(columnDefinition = "TEXT", nullable = false)
	private String body;

	@Column(name = "image_url", columnDefinition = "TEXT")
	private String imageUrl;

	@Column(name = "is_correct", nullable = false)
	private boolean correct;
}
