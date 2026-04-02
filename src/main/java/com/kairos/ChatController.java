package com.kairos;

import dev.langchain4j.model.chat.ChatLanguageModel;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

	private final ChatLanguageModel chatLanguageModel;
	private final ChatMessageRepository repository;

	// チャット送信
	@GetMapping
	public String chat(@RequestParam String message) {
		// 1. ユーザーの発言を保存
		repository.save(new ChatMessage(null, "user", message));

		// 2. AIの回答を生成
		String response = chatLanguageModel.generate(message);

		// 3. AIの回答を保存
		repository.save(new ChatMessage(null, "ai", response));

		return response;
	}

	// 履歴取得
	@GetMapping("/history")
	public List<ChatMessage> getHistory() {
		return repository.findAll();
	}
}
