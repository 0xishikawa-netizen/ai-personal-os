package com.kairos.quiz;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kairos.quiz.dto.QuizChapterDto;
import com.kairos.quiz.dto.QuizChoiceDto;
import com.kairos.quiz.dto.QuizQuestionDto;
import com.kairos.quiz.dto.QuizSectionDto;
import com.kairos.quiz.dto.QuizStoreDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QuizService {

	private final QuizSectionRepository sectionRepository;
	private final QuizChapterRepository chapterRepository;
	private final QuizQuestionRepository questionRepository;
	private final ObjectMapper objectMapper;

	public QuizStoreDto getStore() {
		var sections = sectionRepository.findAllByOrderBySortOrderAsc().stream()
				.map(this::toSectionDto)
				.toList();
		var chapters = chapterRepository.findAll().stream()
				.sorted(Comparator.comparing(QuizChapterEntity::getSectionId).thenComparingInt(QuizChapterEntity::getSortOrder))
				.map(this::toChapterDto)
				.toList();
		var questions = questionRepository.findAll().stream()
				.map(this::toQuestionDto)
				.toList();
		return new QuizStoreDto(sections, chapters, questions);
	}

	@Transactional
	public QuizSectionDto createSection(String name, String description) {
		int order = nextSectionOrder();
		var e = new QuizSectionEntity();
		e.setId(newId("sec"));
		e.setName(name);
		e.setDescription(description != null ? description : "");
		e.setSortOrder(order);
		sectionRepository.save(e);
		return toSectionDto(e);
	}

	@Transactional
	public QuizSectionDto updateSection(String id, String name, String description, Integer order) {
		var e = sectionRepository.findById(id).orElseThrow();
		if (name != null) e.setName(name);
		if (description != null) e.setDescription(description);
		if (order != null) e.setSortOrder(order);
		sectionRepository.save(e);
		return toSectionDto(e);
	}

	@Transactional
	public void deleteSection(String id) {
		var chapters = chapterRepository.findBySectionIdOrderBySortOrderAsc(id);
		for (var ch : chapters) {
			questionRepository.deleteByChapterId(ch.getId());
		}
		chapterRepository.deleteBySectionId(id);
		sectionRepository.deleteById(id);
	}

	@Transactional
	public QuizChapterDto createChapter(String sectionId, String title) {
		var ch = new QuizChapterEntity();
		ch.setId(newId("ch"));
		ch.setSectionId(sectionId);
		ch.setTitle(title);
		ch.setSortOrder(nextChapterOrder(sectionId));
		chapterRepository.save(ch);
		return toChapterDto(ch);
	}

	@Transactional
	public QuizChapterDto updateChapter(String id, String title, String sectionId, Integer order) {
		var e = chapterRepository.findById(id).orElseThrow();
		if (title != null) e.setTitle(title);
		if (sectionId != null) e.setSectionId(sectionId);
		if (order != null) e.setSortOrder(order);
		chapterRepository.save(e);
		return toChapterDto(e);
	}

	@Transactional
	public void deleteChapter(String id) {
		questionRepository.deleteByChapterId(id);
		chapterRepository.deleteById(id);
	}

	@Transactional
	public QuizQuestionDto upsertQuestion(QuizQuestionDto dto) {
		QuizQuestionEntity e;
		if (dto.id() != null && !dto.id().isBlank() && questionRepository.existsById(dto.id())) {
			e = questionRepository.findById(dto.id()).orElseThrow();
		} else {
			e = new QuizQuestionEntity();
			e.setId(dto.id() != null && !dto.id().isBlank() ? dto.id() : newId("q"));
		}
		e.setChapterId(dto.chapterId());
		e.setQuestion(dto.question() != null ? dto.question() : "");
		var choices = dto.choices() != null ? dto.choices() : List.<QuizChoiceDto>of();
		var answers = dto.answers() != null ? dto.answers() : List.<String>of();
		try {
			e.setChoicesJson(objectMapper.writeValueAsString(choices));
			e.setAnswersJson(objectMapper.writeValueAsString(answers));
		} catch (Exception ex) {
			throw new IllegalArgumentException("choices/answers JSON", ex);
		}
		e.setExplanation(dto.explanation() != null ? dto.explanation() : "");
		e.setDifficulty(dto.difficulty());
		questionRepository.save(e);
		return toQuestionDto(e);
	}

	@Transactional
	public void deleteQuestion(String id) {
		questionRepository.deleteById(id);
	}

	@Transactional
	public QuizStoreDto importStore(QuizStoreDto dto) {
		questionRepository.deleteAll();
		chapterRepository.deleteAll();
		sectionRepository.deleteAll();
		for (var s : dto.sections()) {
			var e = new QuizSectionEntity();
			e.setId(s.id());
			e.setName(s.name());
			e.setDescription(s.description() != null ? s.description() : "");
			e.setSortOrder(s.order());
			sectionRepository.save(e);
		}
		for (var c : dto.chapters()) {
			var e = new QuizChapterEntity();
			e.setId(c.id());
			e.setSectionId(c.sectionId());
			e.setTitle(c.title());
			e.setSortOrder(c.order());
			chapterRepository.save(e);
		}
		for (var q : dto.questions()) {
			upsertQuestion(q);
		}
		return getStore();
	}

	private int nextSectionOrder() {
		return sectionRepository.findAll().stream().mapToInt(QuizSectionEntity::getSortOrder).max().orElse(-1) + 1;
	}

	private int nextChapterOrder(String sectionId) {
		return chapterRepository.findBySectionIdOrderBySortOrderAsc(sectionId).stream()
				.mapToInt(QuizChapterEntity::getSortOrder).max().orElse(-1) + 1;
	}

	private static String newId(String prefix) {
		return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
	}

	private QuizSectionDto toSectionDto(QuizSectionEntity e) {
		return new QuizSectionDto(e.getId(), e.getName(),
				e.getDescription() != null && !e.getDescription().isEmpty() ? e.getDescription() : null,
				e.getSortOrder());
	}

	private QuizChapterDto toChapterDto(QuizChapterEntity e) {
		return new QuizChapterDto(e.getId(), e.getSectionId(), e.getTitle(), e.getSortOrder());
	}

	private QuizQuestionDto toQuestionDto(QuizQuestionEntity e) {
		try {
			List<QuizChoiceDto> choices = objectMapper.readValue(e.getChoicesJson(), new TypeReference<>() {});
			List<String> answers = objectMapper.readValue(e.getAnswersJson(), new TypeReference<>() {});
			return new QuizQuestionDto(
					e.getId(),
					e.getChapterId(),
					e.getQuestion(),
					choices,
					answers,
					e.getExplanation(),
					e.getDifficulty()
			);
		} catch (Exception ex) {
			throw new IllegalStateException("question " + e.getId(), ex);
		}
	}
}
