package com.kairos.quiz.repository;

import com.kairos.quiz.domain.QuizAnswerLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface QuizAnswerLogRepository extends JpaRepository<QuizAnswerLogEntity, String> {

	@Query("select l from QuizAnswerLogEntity l where l.userId = :userId order by l.answeredAt desc")
	List<QuizAnswerLogEntity> findByUserIdOrderByAnsweredAtDesc(@Param("userId") String userId);

	@Query("select q.chapterId, count(l), coalesce(sum(case when l.correct = true then 1 else 0 end), 0) from QuizAnswerLogEntity l join l.question q where l.userId = :userId group by q.chapterId")
	List<Object[]> statsByChapterForUser(@Param("userId") String userId);
}
