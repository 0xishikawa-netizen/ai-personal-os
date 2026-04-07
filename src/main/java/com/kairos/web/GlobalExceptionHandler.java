package com.kairos.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	private final Environment environment;

	public GlobalExceptionHandler(Environment environment) {
		this.environment = environment;
	}

	@ExceptionHandler(QuizException.class)
	public ResponseEntity<ErrorResponse> quiz(QuizException ex) {
		int s = ex.getStatus().value();
		return ResponseEntity.status(ex.getStatus())
				.body(new ErrorResponse(ex.getCode(), ex.getMessage(), s));
	}

	@ExceptionHandler(ResponseStatusException.class)
	public ResponseEntity<ErrorResponse> rse(ResponseStatusException ex) {
		HttpStatus st = HttpStatus.valueOf(ex.getStatusCode().value());
		String code = st == HttpStatus.BAD_REQUEST ? "BAD_REQUEST" : "HTTP_ERROR";
		return ResponseEntity.status(st)
				.body(new ErrorResponse(code, ex.getReason() != null ? ex.getReason() : st.getReasonPhrase(), st.value()));
	}

	/**
	 * JPA / JDBC の失敗（例: カラム未定義 {@code memo}、制約違反）。クライアントには DB の原因メッセージを短く返す。
	 */
	@ExceptionHandler(DataAccessException.class)
	public ResponseEntity<ErrorResponse> dataAccess(DataAccessException ex) {
		log.error("Data access error", ex);
		String msg = ex.getMostSpecificCause().getMessage();
		if (msg == null || msg.isBlank()) {
			msg = "Database error (see server logs)";
		} else if (msg.length() > 600) {
			msg = msg.substring(0, 600) + "…";
		}
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(new ErrorResponse("DB_ERROR", msg, 500));
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErrorResponse> notReadable(HttpMessageNotReadableException ex) {
		log.warn("Bad request body: {}", ex.getMessage());
		String msg = ex.getMostSpecificCause().getMessage();
		if (msg == null || msg.isBlank()) {
			msg = "Invalid or unreadable request body";
		}
		if (msg.length() > 400) {
			msg = msg.substring(0, 400) + "…";
		}
		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
				.body(new ErrorResponse("BAD_REQUEST", msg, 400));
	}

	@ExceptionHandler(HttpMessageNotWritableException.class)
	public ResponseEntity<ErrorResponse> notWritable(HttpMessageNotWritableException ex) {
		log.error("Response serialization failed", ex);
		String msg = exposeInternalErrorDetail()
				? trimDetail(ex.getClass().getSimpleName() + ": " + detailChain(ex))
				: "Response could not be serialized";
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(new ErrorResponse("SERIALIZATION_ERROR", msg, 500));
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponse> fallback(Exception ex) {
		log.error("Unhandled exception (see cause below)", ex);
		String msg = exposeInternalErrorDetail()
				? trimDetail(ex.getClass().getSimpleName() + ": " + detailChain(ex))
				: "An unexpected error occurred";
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(new ErrorResponse("INTERNAL_ERROR", msg, 500));
	}

	private boolean exposeInternalErrorDetail() {
		return !environment.matchesProfiles("prod");
	}

	private static String detailChain(Throwable ex) {
		StringBuilder sb = new StringBuilder();
		Throwable t = ex;
		int depth = 0;
		while (t != null && depth < 5) {
			if (t.getMessage() != null && !t.getMessage().isBlank()) {
				if (!sb.isEmpty()) {
					sb.append(" ← ");
				}
				sb.append(t.getMessage());
			}
			t = t.getCause();
			depth++;
		}
		return !sb.isEmpty() ? sb.toString() : "(no message)";
	}

	private static String trimDetail(String s) {
		if (s.length() <= 1200) {
			return s;
		}
		return s.substring(0, 1200) + "…";
	}
}
