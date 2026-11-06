package com.testmoa.backend.domain.dto.response;

import com.testmoa.backend.domain.entity.ChatParticipant;
import com.testmoa.backend.global.common.ChatRole;

public record ChatRoomResponse(String roomKey, Long recruitmentId, String projectName, String roomName,
                               String projectImage, ChatRole myRole, Partner partner) {
    public record Partner(String nickname, ChatRole role) {}

    public static ChatRoomResponse of(ChatParticipant me) {
        var room = me.getRoom();
        var project = room.getRecruitment().getProject();
        var partner = room.getParticipants().stream()
                .filter(p -> !p.getId().equals(me.getId())).findFirst().orElseThrow();
        return new ChatRoomResponse(room.getRoomKey(), room.getRecruitment().getId(), project.getTitle(),
                me.getCustomName(), project.getImageUrl(), me.getRole(),
                new Partner(partner.getUser().getNickname(), partner.getRole()));
    }
}
