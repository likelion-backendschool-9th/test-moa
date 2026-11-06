package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.ChatMessage;
import java.time.LocalDateTime;

public record ChatMessageResponse(long seq, String from, String text, LocalDateTime sentAt) {
    public static ChatMessageResponse of(ChatMessage message, Long participantId) {
        return new ChatMessageResponse(message.getSeq(),
                message.getSender().getId().equals(participantId) ? "me" : "partner",
                message.getContent(), message.getSentAt());
    }
}
