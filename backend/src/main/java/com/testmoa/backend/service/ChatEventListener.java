package com.testmoa.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class ChatEventListener {
    private final ChatEventHub hub;

    @TransactionalEventListener
    public void messageSaved(ChatMessageSaved event) {
        for (Long userId : event.userIds()) {
            hub.send(userId, "message", Map.of("roomKey", event.roomKey(), "seq", event.seq()));
        }
    }

    @TransactionalEventListener
    public void readAdvanced(ChatReadAdvanced event) {
        for (Long userId : event.userIds()) {
            hub.send(userId, "read", Map.of("roomKey", event.roomKey(),
                    "reader", userId.equals(event.readerUserId()) ? "me" : "partner",
                    "lastReadSeq", event.lastReadSeq()));
        }
    }
}
