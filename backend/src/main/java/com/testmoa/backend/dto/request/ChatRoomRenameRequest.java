package com.testmoa.backend.dto.request;

import com.testmoa.backend.entity.ChatParticipant;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.regex.Pattern;

public record ChatRoomRenameRequest(
        @NotBlank(message = "대화방 이름을 입력해 주세요")
        @Size(max = ChatParticipant.ROOM_NAME_MAX, message = "대화방 이름은 30자까지 쓸 수 있어요")
        String name) {
    private static final Pattern EDGE_WHITESPACE = Pattern.compile("\\A[\\p{Z}\\s]+|[\\p{Z}\\s]+\\z");

    public ChatRoomRenameRequest {
        name = name == null ? null : EDGE_WHITESPACE.matcher(name).replaceAll("");
    }
}
