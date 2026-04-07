package com.kairos.quiz.web;

import com.kairos.quiz.dto.AnswerResultDto;
import com.kairos.quiz.dto.AnswerSubmitDto;
import com.kairos.quiz.dto.QuizChapterDto;
import com.kairos.quiz.dto.QuizImportRequest;
import com.kairos.quiz.dto.QuizQuestionDto;
import com.kairos.quiz.dto.QuizSectionDto;
import com.kairos.quiz.dto.QuizStatsDto;
import com.kairos.quiz.dto.QuizStoreDto;
import com.kairos.quiz.dto.ReorderItemDto;
import com.kairos.quiz.service.QuizService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

/**
 * クイズ API（{@code /api/quiz}）。DTO の入出力は {@link com.kairos.quiz.dto} を参照。
 */
@RestController
@RequestMapping("/api/quiz")
@RequiredArgsConstructor
public class QuizController {

	private final QuizService quizService;
	private final ObjectMapper objectMapper;

	@GetMapping("/store")
	public QuizStoreDto getStore() {
		return quizService.getStore();
	}

	@PostMapping("/export")
	public QuizStoreDto exportStore() {
		return quizService.getStore();
	}

	@GetMapping("/questions")
	public List<QuizQuestionDto> listQuestions(@RequestParam String chapterId) {
		if (chapterId.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "chapterId required");
		}
		return quizService.listQuestionsByChapter(chapterId);
	}

	@GetMapping("/stats")
	public QuizStatsDto stats(@RequestParam String userId) {
		return quizService.getStats(userId);
	}

	@PostMapping("/sections")
	@ResponseStatus(HttpStatus.CREATED)
	public QuizSectionDto createSection(@RequestBody CreateSectionBody body) {
		if (body == null || body.name() == null || body.name().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name required");
		}
		return quizService.createSection(body.name().trim(), body.description(), body.memo());
	}

	public record CreateSectionBody(String name, String description, String memo) {
	}

	/** リテラルパスを {@code /sections/{id}} より先に登録し、{@code id=reorder} 誤マッチを防ぐ */
	@PutMapping("/sections/reorder")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void reorderSections(@RequestBody List<ReorderItemDto> body) {
		if (body == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body required");
		}
		quizService.reorderSections(body);
	}

	/**
	 * 部分更新用 JSON。{@code @RequestBody JsonNode}/{@code ObjectNode} は Jackson が Bean として組み立てようとして失敗するため、
	 * 生の JSON 文字列を {@link ObjectMapper#readTree(String)} でツリー化する。
	 */
	@PutMapping("/sections/{id}")
	public QuizSectionDto updateSection(@PathVariable String id, @RequestBody String body) {
		if (body == null || body.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body required");
		}
		final JsonNode root;
		try {
			root = objectMapper.readTree(body);
		} catch (JsonProcessingException e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid JSON", e);
		}
		if (!root.isObject()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body must be a JSON object");
		}
		return quizService.updateSection(
				id,
				optTextField(root, "name"),
				optTextField(root, "description"),
				optOrderField(root, "order"),
				optMemoFromJson(root));
	}

	/** キーが無い、または JSON null のときは更新しない（部分 PUT 用） */
	private static Optional<String> optTextField(JsonNode root, String field) {
		if (!root.has(field) || root.get(field).isNull()) {
			return Optional.empty();
		}
		return Optional.of(root.get(field).asText());
	}

	/**
	 * メモのみ: キーが無ければ更新しない。キーありで null なら空にクリア。
	 * ツリーとして読むと Map デシリアライズの揺れを避けられる（長文 Markdown も文字列として取得）。
	 */
	private static Optional<String> optMemoFromJson(JsonNode root) {
		if (!root.has("memo")) {
			return Optional.empty();
		}
		JsonNode n = root.get("memo");
		if (n.isNull()) {
			return Optional.of("");
		}
		return Optional.of(n.asText(""));
	}

	private static Optional<Integer> optOrderField(JsonNode root, String field) {
		if (!root.has(field) || root.get(field).isNull()) {
			return Optional.empty();
		}
		JsonNode n = root.get(field);
		if (n.isNumber()) {
			return Optional.of(n.intValue());
		}
		if (n.isTextual()) {
			String s = n.asText();
			if (s.isBlank()) {
				return Optional.empty();
			}
			return Optional.of(Integer.parseInt(s.trim()));
		}
		return Optional.empty();
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

	@PutMapping("/chapters/reorder")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void reorderChapters(@RequestBody List<ReorderItemDto> body) {
		if (body == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body required");
		}
		quizService.reorderChapters(body);
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

	@PostMapping("/questions")
	@ResponseStatus(HttpStatus.CREATED)
	public QuizQuestionDto createQuestion(@RequestBody QuizQuestionDto body) {
		if (body == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body required");
		}
		return quizService.createQuestion(body);
	}

	@PutMapping("/questions/reorder")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void reorderQuestions(@RequestBody List<ReorderItemDto> body) {
		if (body == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body required");
		}
		quizService.reorderQuestions(body);
	}

	@PutMapping("/questions/{id}")
	public QuizQuestionDto updateQuestion(@PathVariable String id, @RequestBody QuizQuestionDto body) {
		if (body == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body required");
		}
		return quizService.updateQuestion(id, body);
	}

	@PostMapping("/questions/bulk")
	@ResponseStatus(HttpStatus.CREATED)
	public List<QuizQuestionDto> bulkQuestions(@RequestBody List<QuizQuestionDto> body) {
		if (body == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body required");
		}
		return quizService.bulkCreateQuestions(body);
	}

	@DeleteMapping("/questions/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteQuestion(@PathVariable String id) {
		quizService.deleteQuestion(id);
	}

	@PostMapping(value = "/questions/import/csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public List<QuizQuestionDto> importCsv(
			@RequestParam String chapterId,
			@RequestPart("file") MultipartFile file) {
		try {
			String text = new String(file.getBytes(), StandardCharsets.UTF_8);
			return quizService.importCsv(chapterId, text);
		} catch (IOException e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "failed to read file");
		}
	}

	@PostMapping(value = "/questions/import/markdown", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public List<QuizQuestionDto> importMarkdown(
			@RequestParam String chapterId,
			@RequestPart("file") MultipartFile file) {
		try {
			String text = new String(file.getBytes(), StandardCharsets.UTF_8);
			return quizService.importMarkdown(chapterId, text);
		} catch (IOException e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "failed to read file");
		}
	}

	@PostMapping("/answer")
	public AnswerResultDto answer(@RequestBody AnswerSubmitDto body) {
		if (body == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body required");
		}
		return quizService.submitAnswer(body);
	}

	@PostMapping("/import")
	public Object importStore(@RequestBody QuizImportRequest body) {
		if (body == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body required");
		}
		return quizService.importStore(body);
	}
}
