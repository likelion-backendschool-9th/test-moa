package com.testmoa.backend.dto.response;

import java.util.List;

public record ChatMessageSliceResponse(List<ChatMessageResponse> messages, boolean hasMore) {}
