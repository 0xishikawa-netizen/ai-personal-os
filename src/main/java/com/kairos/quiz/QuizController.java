package com.kairos.quiz;

import com.kairos.quiz.dto.QuizChapterDto;
import com.kairos.quiz.dto.QuizQuestionDto;
import com.kairos.quiz.dto.QuizSectionDto;
import com.kairos.quiz.dto.QuizStoreDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/quiz")
@RequiredArgsConstructor
public class QuizController {

	private final QuizService quizService;

	@GetMapping("/store")
	public QuizStoreDto getStore() {
		return quizService.getStore();
	}

	@PostMapping("/sections")
	@ResponseStatus(HttpStatus.CREATED)
	public QuizSectionDto createSection(@RequestBody CreateSectionBody body) {
		if (body == null || body.name() == null || body.name().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name required");
		}
		return quizService.createSection(body.name().trim(), body.description());
	}

	public record CreateSectionBody(String name, String description) {
	}

	public record UpdateSectionBody(String name, String description, Integer order) {
	}

	@PutMapping("/sections/{id}")
	public QuizSectionDto updateSection(@PathVariable String id, @RequestBody UpdateSectionBody body) {
		if (body == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body required");
		}
		return quizService.updateSection(id, body.name(), body.description(), body.order());
	}

	@DeleteMapping("/sections/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteSection(@PathVariable String id) {
		quizService.deleteSection(id);
	}

	public record CreateChapterBody(String sectionId, String title) {
	}

	@PostMapping("/chapters")
	@ResponseStatus(HttpStatus.CREATED)
	public QuizChapterDto createChapter(@RequestBody CreateChapterBody body) {
		if (body == null || body.sectionId() == null || body.sectionId().isBlank()
				|| body.title() == null || body.title().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sectionId and title required");
		}
		return quizService.createChapter(body.sectionId().trim(), body.title().trim());
	}

	public record UpdateChapterBody(String title, String sectionId, Integer order) {
	}

	@PutMapping("/chapters/{id}")
	public QuizChapterDto updateChapter(@PathVariable String id, @RequestBody UpdateChapterBody body) {
		if (body == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body required");
		}
		return quizService.updateChapter(id, body.title(), body.sectionId(), body.order());
	}

	@DeleteMapping("/chapters/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteChapter(@PathVariable String id) {
		quizService.deleteChapter(id);
	}

	@PutMapping("/questions")
	public QuizQuestionDto upsertQuestion(@RequestBody QuizQuestionDto body) {
		if (body == null || body.chapterId() == null || body.chapterId().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "chapterId required");
		}
		return quizService.upsertQuestion(body);
	}

	@DeleteMapping("/questions/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteQuestion(@PathVariable String id) {
		quizService.deleteQuestion(id);
	}

	@PostMapping("/import")
	public QuizStoreDto importStore(@RequestBody QuizStoreDto body) {
		if (body == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body required");
		}
		return quizService.importStore(body);
	}
}
