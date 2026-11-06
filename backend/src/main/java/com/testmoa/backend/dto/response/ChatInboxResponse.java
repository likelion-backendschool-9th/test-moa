package com.testmoa.backend.dto.response;

import com.testmoa.backend.repository.projection.ChatInboxEntry;
import com.testmoa.backend.entity.enums.ChatRole;
import java.time.LocalDateTime;
import java.util.List;

public record ChatInboxResponse(List<Room> rooms, long total, Counts counts) {
    public record Counts(long all, long tester, long developer) {}

    public record Room(String roomKey, Long recruitmentId, String projectName, String roomName,
                       String projectImage, ChatRole myRole, ChatPartnerResponse partner,
                       String lastMessage, LocalDateTime lastMessageAt) {
        public static Room of(ChatInboxEntry entry) {
            return new Room(entry.roomKey(), entry.recruitmentId(), entry.projectName(), entry.roomName(),
                    entry.projectImage(), entry.myRole(),
                    new ChatPartnerResponse(entry.partnerNickname(), entry.partnerRole()),
                    entry.lastMessage(), entry.lastMessageAt());
        }
    }
}
