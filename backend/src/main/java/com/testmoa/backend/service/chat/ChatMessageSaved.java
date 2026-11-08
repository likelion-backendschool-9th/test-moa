package com.testmoa.backend.service.chat;

import java.util.List;

public record ChatMessageSaved(String roomKey, long seq, List<Long> userIds) {}
