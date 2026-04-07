package com.kairos.quiz.repository;

import com.kairos.quiz.domain.QuizChapterEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizChapterRepository extends JpaRepository<QuizChapterEntity, String> {

	List<QuizChapterEntity> findBySectionIdOrderBySortOrderAsc(String sectionId);

	void deleteBySectionId(String sectionId);
}
