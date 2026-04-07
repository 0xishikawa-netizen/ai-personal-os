package com.kairos.web;

public record ErrorResponse(String code, String message, int status) {
}
