package com.kairos.quiz.service;

import com.kairos.quiz.domain.QuizAnswerLogEntity;
import com.kairos.quiz.domain.QuizChapterEntity;
import com.kairos.quiz.domain.QuizChoiceEntity;
import com.kairos.quiz.domain.QuizQuestionEntity;
import com.kairos.quiz.domain.QuizSectionEntity;
import com.kairos.quiz.domain.QuizTagEntity;
import com.kairos.quiz.dto.AnswerResultDto;
import com.kairos.quiz.dto.AnswerSubmitDto;
import com.kairos.quiz.dto.ChoiceDto;
import com.kairos.quiz.dto.QuizChapterDto;
import com.kairos.quiz.dto.QuizImportPreviewDto;
import com.kairos.quiz.dto.QuizImportRequest;
import com.kairos.quiz.dto.QuizQuestionDto;
import com.kairos.quiz.dto.QuizSectionDto;
import com.kairos.quiz.dto.QuizStatsDto;
import com.kairos.quiz.dto.QuizStoreDto;
import com.kairos.quiz.dto.QuizTagDto;
import com.kairos.quiz.dto.ReorderItemDto;
import com.kairos.quiz.dto.WeakChapterDto;
import com.kairos.quiz.repository.QuizAnswerLogRepository;
import com.kairos.quiz.repository.QuizChapterRepository;
import com.kairos.quiz.repository.QuizQuestionRepository;
import com.kairos.quiz.repository.QuizSectionRepository;
import com.kairos.quiz.repository.QuizTagRepository;
import com.kairos.web.QuizException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.StringReader;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * クイズストアの読み書き、解答記録、インポート、並び替えなどのアプリケーションロジック。
 */
@Service
@RequiredArgsConstructor
public class QuizService {

	private static final Set<String> LABELS = Set.of("A", "B", "C", "D", "E");

	private final QuizSectionRepository sectionRepository;
	private final QuizChapterRepository chapterRepository;
	private final QuizQuestionRepository questionRepository;
	private final QuizTagRepository tagRepository;
	private final QuizAnswerLogRepository answerLogRepository;

	@Transactional(readOnly = true)
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

	@Transactional(readOnly = true)
	public List<QuizQuestionDto> listQuestionsByChapter(String chapterId) {
		return questionRepository.findByChapterIdOrderBySortOrderAscIdAsc(chapterId).stream()
				.map(this::toQuestionDto)
				.toList();
	}

	@Transactional
	public QuizSectionDto createSection(String name, String description, String memo) {
		int order = nextSectionOrder();
		var e = new QuizSectionEntity();
		e.setId(newId("sec"));
		e.setName(name);
		e.setDescription(description != null ? description : "");
		e.setMemo(memo != null ? memo : "");
		e.setSortOrder(order);
		sectionRepository.save(e);
		return toSectionDto(e);
	}

	@Transactional
	public QuizSectionDto updateSection(
			String id,
			Optional<String> name,
			Optional<String> description,
			Optional<Integer> order,
			Optional<String> memo) {
		var e = sectionRepository.findById(id).orElseThrow(() -> notFound("SECTION_NOT_FOUND", "section"));
		name.ifPresent(e::setName);
		description.ifPresent(e::setDescription);
		order.ifPresent(e::setSortOrder);
		memo.ifPresent(e::setMemo);
		sectionRepository.save(e);
		sectionRepository.flush();
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
		var e = chapterRepository.findById(id).orElseThrow(() -> notFound("CHAPTER_NOT_FOUND", "chapter"));
		if (title != null) {
			e.setTitle(title);
		}
		if (sectionId != null) {
			e.setSectionId(sectionId);
		}
		if (order != null) {
			e.setSortOrder(order);
		}
		chapterRepository.save(e);
		return toChapterDto(e);
	}

	@Transactional
	public void deleteChapter(String id) {
		questionRepository.deleteByChapterId(id);
		chapterRepository.deleteById(id);
	}

	@Transactional
	public QuizQuestionDto createQuestion(QuizQuestionDto dto) {
		validateQuestionPayload(dto);
		var e = new QuizQuestionEntity();
		e.setId(dto.id() != null && !dto.id().isBlank() ? dto.id() : newId("q"));
		e.setChapterId(dto.chapterId());
		applyQuestionFields(e, dto);
		replaceChoices(e, dto.choices());
		replaceTags(e, dto.tags());
		applyQuestionType(e, dto.questionType());
		questionRepository.save(e);
		return toQuestionDto(e);
	}

	@Transactional
	public QuizQuestionDto updateQuestion(String id, QuizQuestionDto dto) {
		validateQuestionPayload(dto);
		var e = questionRepository.findById(id).orElseThrow(() -> notFound("QUESTION_NOT_FOUND", "question"));
		e.setChapterId(dto.chapterId());
		applyQuestionFields(e, dto);
		replaceChoices(e, dto.choices());
		replaceTags(e, dto.tags());
		applyQuestionType(e, dto.questionType());
		questionRepository.save(e);
		return toQuestionDto(e);
	}

	@Transactional
	public List<QuizQuestionDto> bulkCreateQuestions(List<QuizQuestionDto> list) {
		List<QuizQuestionDto> out = new ArrayList<>();
		for (QuizQuestionDto dto : list) {
			out.add(createQuestion(dto));
		}
		return out;
	}

	@Transactional
	public void deleteQuestion(String id) {
		questionRepository.deleteById(id);
	}

	@Transactional
	public Object importStore(QuizImportRequest req) {
		if (req.store() == null) {
			throw new QuizException("IMPORT_INVALID", "store が必須です", HttpStatus.BAD_REQUEST);
		}
		String strat = req.strategy() != null ? req.strategy().trim().toLowerCase(Locale.ROOT) : "";
		if (!strat.equals("replace") && !strat.equals("merge")) {
			throw new QuizException("IMPORT_STRATEGY", "strategy は replace または merge を指定してください", HttpStatus.BAD_REQUEST);
		}
		validateImportStore(req.store());
		if (req.dryRun()) {
			var s = req.store();
			return new QuizImportPreviewDto(s.sections().size(), s.chapters().size(), s.questions().size(), true);
		}
		if ("replace".equals(strat)) {
			return importReplace(req.store());
		}
		return importMerge(req.store());
	}

	/**
	 * JSON インポート前の整合性チェック（参照・重複・問題の最低要件）。
	 */
	private void validateImportStore(QuizStoreDto dto) {
		if (dto.sections() == null || dto.chapters() == null || dto.questions() == null) {
			throw new QuizException("IMPORT_SHAPE", "store に sections・chapters・questions（配列）がすべて必要です", HttpStatus.BAD_REQUEST);
		}
		Set<String> sectionIds = new HashSet<>();
		for (QuizSectionDto s : dto.sections()) {
			if (s.id() == null || s.id().isBlank()) {
				throw new QuizException("IMPORT_SECTION_ID", "大分類ごとに id（空でない文字列）が必要です", HttpStatus.BAD_REQUEST);
			}
			if (s.name() == null || s.name().isBlank()) {
				throw new QuizException("IMPORT_SECTION_NAME", "大分類 " + s.id() + ": name が必須です", HttpStatus.BAD_REQUEST);
			}
			if (!sectionIds.add(s.id())) {
				throw new QuizException("IMPORT_DUP_SECTION", "大分類 id の重複: " + s.id(), HttpStatus.BAD_REQUEST);
			}
		}
		Set<String> chapterIds = new HashSet<>();
		for (QuizChapterDto c : dto.chapters()) {
			if (c.id() == null || c.id().isBlank()) {
				throw new QuizException("IMPORT_CHAPTER_ID", "チャプターごとに id（空でない文字列）が必要です", HttpStatus.BAD_REQUEST);
			}
			if (c.title() == null || c.title().isBlank()) {
				throw new QuizException("IMPORT_CHAPTER_TITLE", "チャプター " + c.id() + ": title が必須です", HttpStatus.BAD_REQUEST);
			}
			if (c.sectionId() == null || c.sectionId().isBlank() || !sectionIds.contains(c.sectionId())) {
				throw new QuizException("IMPORT_CHAPTER_SECTION", "チャプター " + c.id() + ": sectionId はインポート対象の大分類 id と一致させてください", HttpStatus.BAD_REQUEST);
			}
			if (!chapterIds.add(c.id())) {
				throw new QuizException("IMPORT_DUP_CHAPTER", "チャプター id の重複: " + c.id(), HttpStatus.BAD_REQUEST);
			}
		}
		Set<String> questionIds = new HashSet<>();
		int qi = 0;
		for (QuizQuestionDto q : dto.questions()) {
			qi++;
			if (q.id() != null && !q.id().isBlank() && !questionIds.add(q.id())) {
				throw new QuizException("IMPORT_DUP_QUESTION", "問題 #" + qi + ": 問題 id の重複（" + q.id() + "）", HttpStatus.BAD_REQUEST);
			}
			if (q.chapterId() == null || q.chapterId().isBlank() || !chapterIds.contains(q.chapterId())) {
				throw new QuizException("IMPORT_QUESTION_CHAPTER", "問題 #" + qi + ": chapterId はインポート対象のチャプター id と一致させてください", HttpStatus.BAD_REQUEST);
			}
			if (q.body() == null || q.body().isBlank()) {
				throw new QuizException("IMPORT_QUESTION_BODY", "問題 #" + qi + ": 問題文（body）が必須です", HttpStatus.BAD_REQUEST);
			}
			try {
				validateQuestionPayload(q);
			} catch (QuizException ex) {
				throw new QuizException(ex.getCode(), "問題 #" + qi + ": " + ex.getMessage(), ex.getStatus());
			}
		}
	}

	@Transactional
	public QuizStoreDto importReplace(QuizStoreDto dto) {
		questionRepository.deleteAll();
		chapterRepository.deleteAll();
		sectionRepository.deleteAll();
		for (var s : dto.sections()) {
			var e = new QuizSectionEntity();
			e.setId(s.id());
			e.setName(s.name());
			e.setDescription(s.description() != null ? s.description() : "");
			e.setMemo(s.memo() != null ? s.memo() : "");
			e.setSortOrder(s.sortOrder());
			sectionRepository.save(e);
		}
		for (var c : dto.chapters()) {
			var e = new QuizChapterEntity();
			e.setId(c.id());
			e.setSectionId(c.sectionId());
			e.setTitle(c.title());
			e.setSortOrder(c.sortOrder());
			chapterRepository.save(e);
		}
		for (var q : dto.questions()) {
			createQuestion(q);
		}
		return getStore();
	}

	@Transactional
	public QuizStoreDto importMerge(QuizStoreDto dto) {
		for (var s : dto.sections()) {
			sectionRepository.findById(s.id()).ifPresentOrElse(e -> {
				e.setName(s.name());
				e.setDescription(s.description() != null ? s.description() : "");
				if (s.memo() != null) {
					e.setMemo(s.memo());
				}
				e.setSortOrder(s.sortOrder());
				sectionRepository.save(e);
			}, () -> {
				var e = new QuizSectionEntity();
				e.setId(s.id());
				e.setName(s.name());
				e.setDescription(s.description() != null ? s.description() : "");
				e.setMemo(s.memo() != null ? s.memo() : "");
				e.setSortOrder(s.sortOrder());
				sectionRepository.save(e);
			});
		}
		for (var c : dto.chapters()) {
			chapterRepository.findById(c.id()).ifPresentOrElse(e -> {
				e.setTitle(c.title());
				e.setSectionId(c.sectionId());
				e.setSortOrder(c.sortOrder());
				chapterRepository.save(e);
			}, () -> {
				var e = new QuizChapterEntity();
				e.setId(c.id());
				e.setSectionId(c.sectionId());
				e.setTitle(c.title());
				e.setSortOrder(c.sortOrder());
				chapterRepository.save(e);
			});
		}
		for (var q : dto.questions()) {
			if (q.id() != null && questionRepository.existsById(q.id())) {
				updateQuestion(q.id(), q);
			} else {
				createQuestion(q);
			}
		}
		return getStore();
	}

	@Transactional
	public void reorderSections(List<ReorderItemDto> items) {
		for (ReorderItemDto it : items) {
			sectionRepository.findById(it.id()).ifPresent(e -> {
				e.setSortOrder(it.sortOrder());
				sectionRepository.save(e);
			});
		}
	}

	@Transactional
	public void reorderChapters(List<ReorderItemDto> items) {
		for (ReorderItemDto it : items) {
			chapterRepository.findById(it.id()).ifPresent(e -> {
				e.setSortOrder(it.sortOrder());
				chapterRepository.save(e);
			});
		}
	}

	@Transactional
	public void reorderQuestions(List<ReorderItemDto> items) {
		for (ReorderItemDto it : items) {
			questionRepository.findById(it.id()).ifPresent(e -> {
				e.setSortOrder(it.sortOrder());
				questionRepository.save(e);
			});
		}
	}

	@Transactional
	public AnswerResultDto submitAnswer(AnswerSubmitDto req) {
		if (req.userId() == null || req.userId().isBlank()) {
			throw new QuizException("ANSWER_USER", "userId required", HttpStatus.BAD_REQUEST);
		}
		var q = questionRepository.findById(req.questionId())
				.orElseThrow(() -> notFound("QUESTION_NOT_FOUND", "question"));
		List<String> correct = q.getChoices().stream()
				.filter(QuizChoiceEntity::isCorrect)
				.map(c -> c.getLabel().toUpperCase(Locale.ROOT))
				.sorted()
				.toList();
		List<String> chosen = (req.chosen() != null ? req.chosen() : List.<String>of()).stream()
				.map(s -> s.toUpperCase(Locale.ROOT).trim())
				.filter(LABELS::contains)
				.distinct()
				.sorted()
				.toList();
		boolean ok = correct.equals(chosen);
		var log = new QuizAnswerLogEntity();
		log.setId(newId("log"));
		log.setUserId(req.userId());
		log.setQuestion(q);
		log.setChosen(chosen.toArray(new String[0]));
		log.setCorrect(ok);
		log.setTimeSpentMs(req.timeSpentMs());
		log.setAnsweredAt(Instant.now());
		answerLogRepository.save(log);
		String explain = q.getExplanation() != null && !q.getExplanation().isBlank() ? q.getExplanation() : null;
		return new AnswerResultDto(ok, correct, explain);
	}

	@Transactional(readOnly = true)
	public QuizStatsDto getStats(String userId) {
		if (userId == null || userId.isBlank()) {
			throw new QuizException("STATS_USER", "userId required", HttpStatus.BAD_REQUEST);
		}
		long totalQ = questionRepository.count();
		List<QuizAnswerLogEntity> logs = answerLogRepository.findByUserIdOrderByAnsweredAtDesc(userId);
		long n = logs.size();
		long correct = logs.stream().filter(QuizAnswerLogEntity::isCorrect).count();
		double acc = n == 0 ? 0.0 : (100.0 * correct / n);
		int streak = computeStreak(logs);

		List<WeakChapterDto> weak = new ArrayList<>();
		for (Object[] row : answerLogRepository.statsByChapterForUser(userId)) {
			String chId = (String) row[0];
			long total = ((Number) row[1]).longValue();
			long c = ((Number) row[2]).longValue();
			if (total < 3) {
				continue;
			}
			double rate = 100.0 * c / total;
			if (rate < 60.0) {
				chapterRepository.findById(chId).ifPresent(ch -> weak.add(new WeakChapterDto(
						chId, ch.getSectionId(), ch.getTitle(), rate)));
			}
		}
		weak.sort(Comparator.comparingDouble(WeakChapterDto::accuracyPercent));
		return new QuizStatsDto(totalQ, n, acc, streak, weak);
	}

	@Transactional
	public List<QuizQuestionDto> importCsv(String chapterId, String csvText) {
		if (chapterId == null || chapterId.isBlank()) {
			throw new QuizException("CSV_CHAPTER", "chapterId required", HttpStatus.BAD_REQUEST);
		}
		if (!chapterRepository.existsById(chapterId)) {
			throw new QuizException("CHAPTER_NOT_FOUND", "chapter not found", HttpStatus.NOT_FOUND);
		}
		List<QuizQuestionDto> created = new ArrayList<>();
		try (BufferedReader br = new BufferedReader(new StringReader(csvText))) {
			String line;
			boolean first = true;
			int order = nextQuestionOrder(chapterId);
			while ((line = br.readLine()) != null) {
				if (first) {
					first = false;
					if (line.toLowerCase(Locale.ROOT).startsWith("body,")) {
						continue;
					}
				}
				QuizQuestionDto dto = parseCsvLine(line, chapterId, order++);
				if (dto != null) {
					created.add(createQuestion(dto));
				}
			}
		} catch (Exception e) {
			throw new QuizException("CSV_PARSE", e.getMessage(), HttpStatus.BAD_REQUEST);
		}
		return created;
	}

	@Transactional
	public List<QuizQuestionDto> importMarkdown(String chapterId, String md) {
		if (chapterId == null || chapterId.isBlank()) {
			throw new QuizException("MD_CHAPTER", "chapterId required", HttpStatus.BAD_REQUEST);
		}
		if (!chapterRepository.existsById(chapterId)) {
			throw new QuizException("CHAPTER_NOT_FOUND", "chapter not found", HttpStatus.NOT_FOUND);
		}
		String[] blocks = md.split("(?m)^---\\s*$");
		int order = nextQuestionOrder(chapterId);
		List<QuizQuestionDto> created = new ArrayList<>();
		for (String block : blocks) {
			QuizQuestionDto dto = parseMarkdownBlock(block.strip(), chapterId, order++);
			if (dto != null) {
				created.add(createQuestion(dto));
			}
		}
		return created;
	}

	private int nextQuestionOrder(String chapterId) {
		return questionRepository.findByChapterIdOrderBySortOrderAscIdAsc(chapterId).stream()
				.mapToInt(QuizQuestionEntity::getSortOrder)
				.max()
				.orElse(-1) + 1;
	}

	private QuizQuestionDto parseCsvLine(String line, String chapterId, int sortOrder) {
		// naive CSV: split on comma respecting quotes could use regex — keep simple
		String[] p = splitCsvLine(line);
		if (p.length < 8) {
			return null;
		}
		String body = p[0].trim();
		if (body.isEmpty()) {
			return null;
		}
		List<ChoiceDto> choices = new ArrayList<>();
		String[] labs = {"A", "B", "C", "D", "E"};
		for (int i = 0; i < 5; i++) {
			String t = i + 1 < p.length ? p[i + 1].trim() : "";
			if (!t.isEmpty()) {
				choices.add(new ChoiceDto(null, labs[i], t, null, false));
			}
		}
		if (choices.size() < 2) {
			return null;
		}
		String ansRaw = p[6].trim().toUpperCase(Locale.ROOT);
		Set<String> ans = Arrays.stream(ansRaw.split(","))
				.map(String::trim)
				.filter(LABELS::contains)
				.collect(Collectors.toSet());
		List<ChoiceDto> marked = new ArrayList<>();
		for (ChoiceDto c : choices) {
			boolean cor = ans.contains(c.label().toUpperCase(Locale.ROOT));
			marked.add(new ChoiceDto(c.id(), c.label(), c.body(), c.imageUrl(), cor));
		}
		choices = marked;
		if (choices.stream().noneMatch(ChoiceDto::isCorrect)) {
			choices.set(0, new ChoiceDto(choices.get(0).id(), choices.get(0).label(), choices.get(0).body(),
					choices.get(0).imageUrl(), true));
		}
		String expl = p.length > 7 ? p[7].trim() : "";
		int diff = 2;
		if (p.length > 8) {
			try {
				diff = Integer.parseInt(p[8].trim());
			} catch (NumberFormatException ignored) {
				// keep default
			}
		}
		diff = Math.min(5, Math.max(1, diff));
		String qType = ans.size() > 1 ? "multiple" : "single";
		return new QuizQuestionDto(newId("q"), chapterId, body, expl, diff, qType, sortOrder, null,
				choices, List.of(), null, null);
	}

	private static String[] splitCsvLine(String line) {
		List<String> out = new ArrayList<>();
		StringBuilder cur = new StringBuilder();
		boolean inQ = false;
		for (int i = 0; i < line.length(); i++) {
			char c = line.charAt(i);
			if (c == '"') {
				inQ = !inQ;
			} else if (c == ',' && !inQ) {
				out.add(cur.toString());
				cur.setLength(0);
			} else {
				cur.append(c);
			}
		}
		out.add(cur.toString());
		return out.toArray(new String[0]);
	}

	private QuizQuestionDto parseMarkdownBlock(String block, String chapterId, int sortOrder) {
		if (block.isBlank()) {
			return null;
		}
		String qText = null;
		List<ChoiceDto> choices = new ArrayList<>();
		String explanation = "";
		int diff = 2;
		for (String raw : block.split("\n")) {
			String ln = raw.strip();
			if (ln.startsWith("## Q:")) {
				qText = ln.substring(5).trim();
			} else if (ln.matches("^[-*]\\s*[A-E]\\s*:.*")) {
				boolean mark = ln.contains("✓") || ln.contains("✔");
				String rest = ln.replaceFirst("^[-*]\\s*", "");
				String lab = rest.substring(0, 1).toUpperCase(Locale.ROOT);
				String txt = rest.substring(rest.indexOf(':') + 1).replace("✓", "").replace("✔", "").trim();
				choices.add(new ChoiceDto(null, lab, txt, null, mark));
			} else if (ln.startsWith(">")) {
				explanation = ln.substring(1).trim();
			} else if (ln.toLowerCase(Locale.ROOT).startsWith("難易度:")) {
				try {
					diff = Integer.parseInt(ln.substring(ln.indexOf(':') + 1).trim());
				} catch (Exception ignored) {
					// keep
				}
			}
		}
		if (qText == null || choices.size() < 2) {
			return null;
		}
		diff = Math.min(5, Math.max(1, diff));
		long cor = choices.stream().filter(ChoiceDto::isCorrect).count();
		if (cor == 0) {
			choices.set(0, new ChoiceDto(null, choices.get(0).label(), choices.get(0).body(), null, true));
			cor = 1;
		}
		String qType = cor > 1 ? "multiple" : "single";
		return new QuizQuestionDto(newId("q"), chapterId, qText, explanation, diff, qType, sortOrder, null,
				choices, List.of(), null, null);
	}

	private int computeStreak(List<QuizAnswerLogEntity> logs) {
		if (logs.isEmpty()) {
			return 0;
		}
		Set<LocalDate> days = new HashSet<>();
		for (QuizAnswerLogEntity l : logs) {
			days.add(LocalDate.ofInstant(l.getAnsweredAt(), ZoneOffset.UTC));
		}
		LocalDate d = LocalDate.now(ZoneOffset.UTC);
		int streak = 0;
		while (days.contains(d)) {
			streak++;
			d = d.minusDays(1);
		}
		return streak;
	}

	private QuizException notFound(String code, String kind) {
		return new QuizException(code, kind + " not found", HttpStatus.NOT_FOUND);
	}

	private void validateQuestionPayload(QuizQuestionDto dto) {
		if (dto.chapterId() == null || dto.chapterId().isBlank()) {
			throw new QuizException("QUESTION_CHAPTER", "chapterId が必須です", HttpStatus.BAD_REQUEST);
		}
		List<ChoiceDto> ch = dto.choices() != null ? dto.choices() : List.of();
		long filled = ch.stream().map(ChoiceDto::body).filter(b -> b != null && !b.isBlank()).count();
		if (filled < 2) {
			throw new QuizException("QUESTION_CHOICES", "本文のある選択肢は2つ以上必要です", HttpStatus.BAD_REQUEST);
		}
		long correct = ch.stream().filter(ChoiceDto::isCorrect).count();
		if (correct < 1) {
			throw new QuizException("QUESTION_ANSWER", "正解の選択肢が1つ以上必要です", HttpStatus.BAD_REQUEST);
		}
	}

	private void applyQuestionFields(QuizQuestionEntity e, QuizQuestionDto dto) {
		e.setQuestion(dto.body() != null ? dto.body() : "");
		e.setExplanation(dto.explanation() != null ? dto.explanation() : "");
		e.setDifficulty(Math.min(5, Math.max(1, dto.difficulty())));
		e.setImageUrl(dto.imageUrl());
		e.setSortOrder(dto.sortOrder());
	}

	private void applyQuestionType(QuizQuestionEntity e, String dtoType) {
		if (dtoType != null && (dtoType.equals("single") || dtoType.equals("multiple"))) {
			e.setQuestionType(dtoType);
			return;
		}
		long n = e.getChoices().stream().filter(QuizChoiceEntity::isCorrect).count();
		e.setQuestionType(n > 1 ? "multiple" : "single");
	}

	private void replaceChoices(QuizQuestionEntity q, List<ChoiceDto> dtos) {
		q.getChoices().clear();
		if (dtos == null) {
			return;
		}
		for (ChoiceDto c : dtos) {
			if (c.body() == null || c.body().isBlank()) {
				continue;
			}
			String lab = normalizeLabel(c.label());
			if (lab == null) {
				continue;
			}
			var ec = new QuizChoiceEntity();
			ec.setId(c.id() != null && !c.id().isBlank() ? c.id() : newId("c"));
			ec.setQuestion(q);
			ec.setLabel(lab);
			ec.setBody(c.body());
			ec.setImageUrl(c.imageUrl());
			ec.setCorrect(c.isCorrect());
			q.getChoices().add(ec);
		}
	}

	private void replaceTags(QuizQuestionEntity q, List<QuizTagDto> dtos) {
		q.getTags().clear();
		if (dtos == null) {
			return;
		}
		for (QuizTagDto t : dtos) {
			if (t.name() == null || t.name().isBlank()) {
				continue;
			}
			QuizTagEntity tag;
			if (t.id() != null && tagRepository.existsById(t.id())) {
				tag = tagRepository.findById(t.id()).orElseThrow();
			} else {
				tag = tagRepository.findByNameIgnoreCase(t.name().trim()).orElseGet(() -> {
					var nt = new QuizTagEntity();
					nt.setId(newId("tag"));
					nt.setName(t.name().trim());
					return tagRepository.save(nt);
				});
			}
			q.getTags().add(tag);
		}
	}

	private static String normalizeLabel(String label) {
		if (label == null || label.isBlank()) {
			return null;
		}
		String u = label.trim().toUpperCase(Locale.ROOT);
		return LABELS.contains(u) ? u : null;
	}

	private int nextSectionOrder() {
		return sectionRepository.findAll().stream().mapToInt(QuizSectionEntity::getSortOrder).max().orElse(-1) + 1;
	}

	private int nextChapterOrder(String sectionId) {
		return chapterRepository.findBySectionIdOrderBySortOrderAsc(sectionId).stream()
				.mapToInt(QuizChapterEntity::getSortOrder)
				.max()
				.orElse(-1) + 1;
	}

	private static String newId(String prefix) {
		return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
	}

	private QuizSectionDto toSectionDto(QuizSectionEntity e) {
		String memoRaw = e.getMemo();
		String memo = memoRaw != null && !memoRaw.isBlank() ? memoRaw : null;
		return new QuizSectionDto(e.getId(), e.getName(),
				e.getDescription() != null && !e.getDescription().isEmpty() ? e.getDescription() : null,
				e.getSortOrder(),
				memo);
	}

	private QuizChapterDto toChapterDto(QuizChapterEntity e) {
		return new QuizChapterDto(e.getId(), e.getSectionId(), e.getTitle(), e.getSortOrder());
	}

	private QuizQuestionDto toQuestionDto(QuizQuestionEntity e) {
		List<ChoiceDto> choices = e.getChoices().stream()
				.map(c -> new ChoiceDto(c.getId(), c.getLabel(), c.getBody(), c.getImageUrl(), c.isCorrect()))
				.toList();
		List<QuizTagDto> tags = e.getTags().stream()
				.map(t -> new QuizTagDto(t.getId(), t.getName()))
				.toList();
		return new QuizQuestionDto(
				e.getId(),
				e.getChapterId(),
				e.getQuestion(),
				e.getExplanation() != null && !e.getExplanation().isEmpty() ? e.getExplanation() : null,
				e.getDifficulty(),
				e.getQuestionType(),
				e.getSortOrder(),
				e.getImageUrl(),
				choices,
				tags,
				e.getCreatedAt(),
				e.getUpdatedAt()
		);
	}
}
