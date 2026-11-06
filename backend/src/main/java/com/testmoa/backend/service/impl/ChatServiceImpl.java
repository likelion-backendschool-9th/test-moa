package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.request.ChatInboxQuery;
import com.testmoa.backend.dto.response.ChatInboxResponse;
import com.testmoa.backend.dto.response.ChatMessageResponse;
import com.testmoa.backend.dto.response.ChatMessageSliceResponse;
import com.testmoa.backend.dto.response.ChatRoomResponse;
import com.testmoa.backend.entity.ChatMessage;
import com.testmoa.backend.entity.ChatParticipant;
import com.testmoa.backend.repository.ChatMessageRepository;
import com.testmoa.backend.repository.ChatParticipantRepository;
import com.testmoa.backend.repository.ChatRoomRepository;
import com.testmoa.backend.repository.projection.ChatInboxEntry;
import com.testmoa.backend.entity.enums.ChatInboxSort;
import com.testmoa.backend.entity.enums.ChatRole;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatServiceImpl implements ChatService {
    private static final int MESSAGE_SLICE_SIZE = 30;
    private final ChatParticipantRepository participantRepository;
    private final ChatRoomRepository roomRepository;
    private final ChatMessageRepository messageRepository;

    @Override
    public ChatInboxResponse getInbox(Long userId, ChatInboxQuery query) {
        var entries = participantRepository.findInboxByUserId(userId);
        String keyword = query.q().toLowerCase(Locale.ROOT);
        var matched = entries.stream().filter(entry -> matches(entry, keyword)).toList();
        long testers = matched.stream().filter(entry -> entry.myRole() == ChatRole.TESTER).count();
        var order = Comparator.comparing(ChatInboxEntry::lastMessageAt);
        if (query.sort() == ChatInboxSort.LATEST) order = order.reversed();
        // 일시가 같으면 정렬 방향과 무관하게 나중에 만든 방이 먼저 온다.
        order = order.thenComparing(ChatInboxEntry::roomId, Comparator.reverseOrder());
        var rooms = matched.stream()
                .filter(entry -> query.role() == null || entry.myRole() == query.role())
                .sorted(order).map(ChatInboxResponse.Room::of).toList();
        return new ChatInboxResponse(rooms, entries.size(),
                new ChatInboxResponse.Counts(matched.size(), testers, matched.size() - testers));
    }

    private boolean matches(ChatInboxEntry entry, String keyword) {
        return keyword.isEmpty()
                || contains(entry.roomName(), keyword)
                || contains(entry.projectName(), keyword)
                || contains(entry.partnerNickname(), keyword);
    }

    private boolean contains(String value, String keyword) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(keyword);
    }

    @Override
    public ChatRoomResponse getRoom(String roomKey, Long userId) {
        var entry = participantRepository.findRoomByRoomKeyAndUserId(roomKey, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return ChatRoomResponse.of(entry);
    }

    @Override
    public ChatMessageSliceResponse getMessages(String roomKey, Long userId, Long before) {
        var me = requireParticipant(roomKey, userId);
        var page = PageRequest.of(0, MESSAGE_SLICE_SIZE);
        var slice = before == null
                ? messageRepository.findByRoomOrderBySeqDesc(me.getRoom(), page)
                : messageRepository.findByRoomAndSeqLessThanOrderBySeqDesc(me.getRoom(), before, page);
        var messages = slice.getContent().stream().sorted(Comparator.comparingLong(ChatMessage::getSeq))
                .map(message -> ChatMessageResponse.of(message, me.getId())).toList();
        return new ChatMessageSliceResponse(messages, slice.hasNext());
    }

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(String roomKey, Long userId, String text) {
        // 참여자 조회가 방을 먼저 로딩하면 잠금 획득 뒤에도 예전 lastSeq를 볼 수 있다.
        // 방을 먼저 잠가 같은 방의 전송이 최신 순번을 읽게 한다.
        var room = roomRepository.findLockedByRoomKey(roomKey)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        var me = requireParticipant(roomKey, userId);
        var message = room.createMessage(me, text);
        messageRepository.save(message);
        participantRepository.unhidePartner(room.getId(), me.getId());
        return ChatMessageResponse.of(message, me.getId());
    }

    private ChatParticipant requireParticipant(String roomKey, Long userId) {
        return participantRepository.findByRoomRoomKeyAndUserIdAndHiddenFalse(roomKey, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }
}
