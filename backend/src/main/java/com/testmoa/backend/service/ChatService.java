package com.testmoa.backend.service;

import com.testmoa.backend.dto.response.ChatRoomResponse;
import com.testmoa.backend.dto.response.ChatReadResponse;
import com.testmoa.backend.dto.response.ChatUnreadResponse;
import com.testmoa.backend.dto.response.ChatInboxResponse;
import com.testmoa.backend.dto.request.ChatInboxQuery;
import com.testmoa.backend.dto.response.ChatMessageResponse;
import com.testmoa.backend.dto.response.ChatMessageSliceResponse;

public interface ChatService {
    record StartResult(com.testmoa.backend.dto.response.ChatStartResponse response, boolean created) {}
    StartResult startChat(Long userId, Long registerId);

    ChatUnreadResponse getUnread(Long userId);
    ChatReadResponse markRead(String roomKey, Long userId, long seq);
    ChatInboxResponse getInbox(Long userId, ChatInboxQuery query);
    ChatRoomResponse renameRoom(String roomKey, Long userId, String name);
    void deleteRoom(String roomKey, Long userId);
    ChatRoomResponse getRoom(String roomKey, Long userId);
    ChatMessageSliceResponse getMessages(String roomKey, Long userId, Long before, Long after);
    ChatMessageResponse sendMessage(String roomKey, Long userId, String text);
}
