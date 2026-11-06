package com.testmoa.backend.domain.dto.response;

import com.testmoa.backend.global.common.ChatRole;

public record ChatPartnerResponse(String nickname, ChatRole role) {}
