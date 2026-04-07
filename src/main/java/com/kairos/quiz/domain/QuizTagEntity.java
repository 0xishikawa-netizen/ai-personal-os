package com.kairos.quiz.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

/**
 * 問題に付与するタグ。テーブル {@code quiz_tag}、多対多は {@code quiz_question_tag}。
 */
@Entity
@Table(name = "quiz_tag")
@Getter
@Setter
@NoArgsConstructor
public class QuizTagEntity {

	@Id
	@Column(length = 40)
	private String id;

	@Column(length = 100, nullable = false, unique = true)
	private String name;

	@ManyToMany(mappedBy = "tags")
	private Set<QuizQuestionEntity> questions = new HashSet<>();
}
