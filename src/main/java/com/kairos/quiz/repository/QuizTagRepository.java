package com.kairos.quiz.repository;

import com.kairos.quiz.domain.QuizTagEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface QuizTagRepository extends JpaRepository<QuizTagEntity, String> {

	Optional<QuizTagEntity> findByNameIgnoreCase(String name);
}
