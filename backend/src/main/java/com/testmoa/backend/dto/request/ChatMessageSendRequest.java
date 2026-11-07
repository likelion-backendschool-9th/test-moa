package com.testmoa.backend.dto.request;

import com.testmoa.backend.entity.ChatMessage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatMessageSendRequest(
        @NotBlank(message = "메시지를 입력해 주세요")
        @Size(max = ChatMessage.CONTENT_MAX, message = "메시지는 10,000자까지 보낼 수 있어요")
        String text) {}
