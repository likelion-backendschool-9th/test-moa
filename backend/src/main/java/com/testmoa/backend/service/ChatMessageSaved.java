package com.testmoa.backend.service;

import java.util.List;

public record ChatMessageSaved(String roomKey, long seq, List<Long> userIds) {}
