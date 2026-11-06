package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.enums.ChatRole;

public record ChatPartnerResponse(String nickname, ChatRole role) {}
