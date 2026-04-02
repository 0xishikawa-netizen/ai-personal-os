package com.kairos.quiz.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record QuizSectionDto(String id, String name, String description, int order) {
}
