package com.kairos;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

/**
 * フロント（別オリジン）から API を直叩きするときの CORS。
 * Vercel 等で Next のプロキシだけ使う場合、ブラウザ→Spring 間では発火しないことが多い。
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

	@Value("${kairos.cors.allowed-origin-patterns:*}")
	private String allowedOriginPatterns;

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		String[] patterns = Arrays.stream(allowedOriginPatterns.split(","))
				.map(String::trim)
				.filter(s -> !s.isEmpty())
				.toArray(String[]::new);
		if (patterns.length == 0) {
			patterns = new String[] { "*" };
		}
		registry.addMapping("/api/**")
				.allowedOriginPatterns(patterns)
				.allowedMethods("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
				.allowedHeaders("*");
	}
}
