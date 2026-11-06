package com.testmoa.backend.dto.response;

import com.testmoa.backend.repository.projection.ChatRoomEntry;
import com.testmoa.backend.entity.enums.ChatRole;

public record ChatRoomResponse(String roomKey, Long recruitmentId, String projectName, String roomName,
                               String projectImage, ChatRole myRole, ChatPartnerResponse partner) {
    public static ChatRoomResponse of(ChatRoomEntry entry) {
        return new ChatRoomResponse(entry.roomKey(), entry.recruitmentId(), entry.projectName(), entry.roomName(),
                entry.projectImage(), entry.myRole(),
                new ChatPartnerResponse(entry.partnerNickname(), entry.partnerRole()));
    }
}
