package com.kairos.quiz.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

/**
 * ユーザーの解答履歴。テーブル {@code quiz_answer_log}。
 */
@Entity
@Table(name = "quiz_answer_log")
@Getter
@Setter
@NoArgsConstructor
public class QuizAnswerLogEntity {

	@Id
	@Column(length = 40)
	private String id;

	@Column(name = "user_id", length = 200, nullable = false)
	private String userId;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "question_id", nullable = false)
	private QuizQuestionEntity question;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(columnDefinition = "text[]", nullable = false)
	private String[] chosen;

	@Column(name = "is_correct", nullable = false)
	private boolean correct;

	@Column(name = "time_spent_ms")
	private Integer timeSpentMs;

	@Column(name = "answered_at", nullable = false)
	private Instant answeredAt = Instant.now();
}
