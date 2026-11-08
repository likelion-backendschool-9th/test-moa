package com.testmoa.backend.repository.projection;

import com.testmoa.backend.entity.enums.ChatRole;
import java.time.LocalDateTime;

/** 채팅함 한 방의 조회 결과. 정렬용 id는 API 응답에 노출하지 않는다. */
public record ChatInboxEntry(Long roomId, String roomKey, Long recruitmentId, Long developerId, String projectName,
                             String roomName, String projectImage, ChatRole myRole,
                             String partnerNickname, ChatRole partnerRole,
                             String lastMessage, LocalDateTime lastMessageAt, long unreadCount) {}
