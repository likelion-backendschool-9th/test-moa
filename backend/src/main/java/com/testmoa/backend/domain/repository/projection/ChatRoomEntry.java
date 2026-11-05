package com.testmoa.backend.domain.repository.projection;

import com.testmoa.backend.global.common.ChatRole;

/** 지우지 않은 내 방의 정보와 상대 정보만 조회한다. */
public record ChatRoomEntry(String roomKey, Long recruitmentId, String projectName, String roomName,
                            String projectImage, ChatRole myRole, String partnerNickname, ChatRole partnerRole) {}
