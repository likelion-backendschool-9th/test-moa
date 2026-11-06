package com.testmoa.backend.service.impl;

import com.testmoa.backend.domain.dto.response.*;
import com.testmoa.backend.domain.entity.ChatMessage;
import com.testmoa.backend.domain.entity.ChatParticipant;
import com.testmoa.backend.domain.repository.*;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Comparator;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatServiceImpl implements ChatService {
    private static final int MESSAGE_SLICE_SIZE = 30;
    private final ChatParticipantRepository participantRepository;
    private final ChatRoomRepository roomRepository;
    private final ChatMessageRepository messageRepository;

    @Override
    public ChatRoomResponse getRoom(String roomKey, Long userId) {
        return ChatRoomResponse.of(requireParticipant(roomKey, userId));
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
        var message = ChatMessage.builder().sender(me).seq(room.getLastSeq() + 1).content(text).build();
        room.nextSeq(message.getSentAt());
        messageRepository.save(message);
        participantRepository.unhidePartner(room.getId(), me.getId());
        return ChatMessageResponse.of(message, me.getId());
    }

    private ChatParticipant requireParticipant(String roomKey, Long userId) {
        return participantRepository.findByRoomRoomKeyAndUserIdAndHiddenFalse(roomKey, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }
}
