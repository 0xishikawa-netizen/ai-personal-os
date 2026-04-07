package com.kairos.quiz.repository;

import com.kairos.quiz.domain.QuizQuestionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestionEntity, String> {

	List<QuizQuestionEntity> findByChapterIdOrderBySortOrderAscIdAsc(String chapterId);

	void deleteByChapterId(String chapterId);
}
