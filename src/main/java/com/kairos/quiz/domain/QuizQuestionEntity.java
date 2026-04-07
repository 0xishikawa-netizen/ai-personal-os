package com.kairos.quiz.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 問題本文・難易度・選択肢・タグ。テーブル {@code quiz_question}。
 */
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

	@Column(name = "question_type", length = 10, nullable = false)
	private String questionType = "single";

	@Column(name = "image_url", columnDefinition = "TEXT")
	private String imageUrl;

	@Column(name = "sort_order", nullable = false)
	private int sortOrder;

	@Column(columnDefinition = "TEXT")
	private String explanation;

	@Column(nullable = false)
	private int difficulty;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
	@OrderBy("label ASC")
	@BatchSize(size = 64)
	private List<QuizChoiceEntity> choices = new ArrayList<>();

	@ManyToMany(fetch = FetchType.LAZY)
	@BatchSize(size = 64)
	@JoinTable(
			name = "quiz_question_tag",
			joinColumns = @JoinColumn(name = "question_id"),
			inverseJoinColumns = @JoinColumn(name = "tag_id")
	)
	private Set<QuizTagEntity> tags = new HashSet<>();

	@PrePersist
	void prePersist() {
		Instant now = Instant.now();
		if (createdAt == null) {
			createdAt = now;
		}
		updatedAt = now;
	}

	@PreUpdate
	void preUpdate() {
		updatedAt = Instant.now();
	}
}
