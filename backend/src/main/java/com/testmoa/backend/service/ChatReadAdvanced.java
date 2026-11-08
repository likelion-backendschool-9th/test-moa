package com.testmoa.backend.service;

import java.util.List;

public record ChatReadAdvanced(String roomKey, Long readerUserId, List<Long> userIds, long lastReadSeq) {}
