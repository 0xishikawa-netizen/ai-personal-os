package com.personalos.aipersonalos;

import dev.langchain4j.model.chat.ChatLanguageModel;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class ChatController {

    private final ChatLanguageModel chatLanguageModel;

    @GetMapping
    public String chat(@RequestParam(value = "message", defaultValue = "自己紹介してください") String message) {
        return chatLanguageModel.generate(message);
    }
}