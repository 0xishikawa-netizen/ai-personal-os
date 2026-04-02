package com.kairos.quiz;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestionEntity, String> {

	List<QuizQuestionEntity> findByChapterIdOrderByIdAsc(String chapterId);

	void deleteByChapterId(String chapterId);
}
