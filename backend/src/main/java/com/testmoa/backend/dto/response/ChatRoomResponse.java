package com.testmoa.backend.dto.response;

import com.testmoa.backend.repository.projection.ChatRoomEntry;
import com.testmoa.backend.entity.enums.ChatRole;

public record ChatRoomResponse(String roomKey, Long recruitmentId, String projectName, String roomName,
                               String projectImage, ChatRole myRole, ChatPartnerResponse partner, long partnerLastReadSeq, boolean readOnly) {
    public static ChatRoomResponse of(ChatRoomEntry entry, boolean readOnly) {
        return new ChatRoomResponse(entry.roomKey(), entry.recruitmentId(), entry.projectName(), entry.roomName(),
                entry.projectImage(), entry.myRole(),
                new ChatPartnerResponse(entry.partnerNickname(), entry.partnerRole()), entry.partnerLastReadSeq(), readOnly);
    }
}
