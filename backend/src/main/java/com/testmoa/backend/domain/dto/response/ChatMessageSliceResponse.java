package com.testmoa.backend.domain.dto.response;

import java.util.List;

public record ChatMessageSliceResponse(List<ChatMessageResponse> messages, boolean hasMore) {}
