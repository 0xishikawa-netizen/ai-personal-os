package com.kairos;

import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * LangChain4j {@code 0.36.x} の BOM には {@code langchain4j-open-ai-spring-boot-starter} 等はあるが、
 * <strong>Google Gemini 用の spring-boot-starter は含まれない</strong>ため、{@link ChatLanguageModel} はここで定義する。
 * （別系統の {@code langchain4j-google-ai-gemini-spring-boot-starter} は BOM 外・別バージョンライン）
 */
@Configuration
public class AiConfig {

	@Bean
	ChatLanguageModel chatLanguageModel(@Value("${langchain4j.google-ai-gemini.chat-model.api-key}") String apiKey,
			@Value("${langchain4j.google-ai-gemini.chat-model.model-name}") String modelName) {
		return GoogleAiGeminiChatModel.builder().apiKey(apiKey).modelName(modelName).build();
	}
}
