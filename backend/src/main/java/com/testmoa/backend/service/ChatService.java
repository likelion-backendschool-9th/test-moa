package com.testmoa.backend.service;

import com.testmoa.backend.domain.dto.response.ChatRoomResponse;
import com.testmoa.backend.domain.dto.response.ChatMessageResponse;
import com.testmoa.backend.domain.dto.response.ChatMessageSliceResponse;

public interface ChatService {
    ChatRoomResponse getRoom(String roomKey, Long userId);
    ChatMessageSliceResponse getMessages(String roomKey, Long userId, Long before);
    ChatMessageResponse sendMessage(String roomKey, Long userId, String text);
}
