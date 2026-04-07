package com.kairos.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

/**
 * Render のヘルスチェック等が {@code /} に HEAD/GET するため、静的リソース 404 と ERROR ログを避ける。
 */
@RestController
public class RootController {

	private static final String BODY = "Kairos API";

	@RequestMapping(value = "/", method = {RequestMethod.GET, RequestMethod.HEAD})
	public ResponseEntity<String> root() {
		return ResponseEntity.ok(BODY);
	}
}
