package com.kairos.quiz.repository;

import com.kairos.quiz.domain.QuizSectionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizSectionRepository extends JpaRepository<QuizSectionEntity, String> {

	List<QuizSectionEntity> findAllByOrderBySortOrderAsc();
}
