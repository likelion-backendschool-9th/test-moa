package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.request.ChatInboxQuery;
import com.testmoa.backend.dto.response.ChatInboxResponse;
import com.testmoa.backend.dto.response.ChatMessageResponse;
import com.testmoa.backend.dto.response.ChatMessageSliceResponse;
import com.testmoa.backend.dto.response.ChatReadResponse;
import com.testmoa.backend.dto.response.ChatRoomResponse;
import com.testmoa.backend.dto.response.ChatStartResponse;
import com.testmoa.backend.dto.response.ChatUnreadResponse;
import com.testmoa.backend.entity.ChatMessage;
import com.testmoa.backend.entity.ChatParticipant;
import com.testmoa.backend.entity.ChatRoom;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.enums.ChatInboxSort;
import com.testmoa.backend.entity.enums.ChatRole;
import com.testmoa.backend.entity.enums.RegisterStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.ChatMessageRepository;
import com.testmoa.backend.repository.ChatParticipantRepository;
import com.testmoa.backend.repository.ChatRoomRepository;
import com.testmoa.backend.repository.RecruitmentRepository;
import com.testmoa.backend.repository.RegisterRepository;
import com.testmoa.backend.repository.projection.ChatInboxEntry;
import com.testmoa.backend.service.ChatMessageSaved;
import com.testmoa.backend.service.ChatReadAdvanced;
import com.testmoa.backend.service.ChatReadOnlyPolicy;
import com.testmoa.backend.service.ChatService;
import com.testmoa.backend.service.SubscriptionChecker;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.Locale;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatServiceImpl implements ChatService {
    private static final int MESSAGE_SLICE_SIZE = 30;
    private final ChatParticipantRepository participantRepository;
    private final ChatRoomRepository roomRepository;
    private final ChatMessageRepository messageRepository;
    private final ApplicationEventPublisher events;
    private final RegisterRepository registerRepository;
    private final RecruitmentRepository recruitmentRepository;
    private final SubscriptionChecker subscriptionChecker;
    private final ChatReadOnlyPolicy readOnlyPolicy;

    @Override
    @Transactional
    public StartResult startChat(Long userId, Long registerId) {
        // 참가 행을 잠근 뒤 방을 조회해야 동시 요청도 기존 방을 반환한다.
        var register = registerRepository.findLockedById(registerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        var recruitment = register.getRecruitment();
        if (!recruitment.getProject().getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }
        var existing = roomRepository.findByRegisterId(registerId);
        if (existing.isPresent()) {
            var mine = existing.get().getParticipants().stream()
                    .filter(participant -> participant.getUser().getId().equals(userId)).findFirst().orElseThrow();
            participantRepository.unhideMine(mine.getId());
            return new StartResult(new ChatStartResponse(existing.get().getRoomKey()), false);
        }
        if (register.getStatus() != RegisterStatus.CONFIRMED) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        subscriptionChecker.require(userId);
        if (readOnlyPolicy.isClosed(recruitment, LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.CHAT_READ_ONLY);
        }
        var room = roomRepository.save(ChatRoom.builder().register(register).build());
        return new StartResult(new ChatStartResponse(room.getRoomKey()), true);
    }


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
        var recruitments = recruitmentRepository.findAllById(entries.stream().map(ChatInboxEntry::recruitmentId).distinct().toList())
                .stream().collect(Collectors.toMap(Recruitment::getId, recruitment -> recruitment));
        var activeDevelopers = subscriptionChecker.activeUserIds(entries.stream().map(ChatInboxEntry::developerId).distinct().toList());
        var now = LocalDateTime.now();
        var rooms = matched.stream()
                .filter(entry -> query.role() == null || entry.myRole() == query.role())
                .sorted(order).map(entry -> ChatInboxResponse.Room.of(entry,
                        readOnlyPolicy.isReadOnly(recruitments.get(entry.recruitmentId()),
                                activeDevelopers.contains(entry.developerId()), now))).toList();
        return new ChatInboxResponse(rooms, entries.size(),
                new ChatInboxResponse.Counts(matched.size(), testers, matched.size() - testers));
    }

    @Override
    public ChatUnreadResponse getUnread(Long userId) {
        return new ChatUnreadResponse(participantRepository.countUnreadByUserId(userId));
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
        var recruitment = recruitmentRepository.findById(entry.recruitmentId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return ChatRoomResponse.of(entry, readOnlyPolicy.isReadOnly(recruitment,
                subscriptionChecker.isActive(entry.developerId()), LocalDateTime.now()));
    }

    @Override
    public ChatMessageSliceResponse getMessages(String roomKey, Long userId, Long before, Long after) {
        if (before != null && after != null) throw new BusinessException(ErrorCode.INVALID_INPUT);
        var me = requireParticipant(roomKey, userId);
        var page = PageRequest.of(0, MESSAGE_SLICE_SIZE);
        var slice = after != null
                ? messageRepository.findByRoomAndSeqGreaterThanOrderBySeqAsc(me.getRoom(), after, page)
                : before == null
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
        events.publishEvent(new ChatMessageSaved(roomKey, message.getSeq(),
                participantRepository.findUserIdsByRoomId(room.getId())));
        return ChatMessageResponse.of(message, me.getId());
    }

    @Override
    @Transactional
    public ChatRoomResponse renameRoom(String roomKey, Long userId, String name) {
        var me = requireParticipant(roomKey, userId);
        if (participantRepository.renameRoom(me.getId(), name) == 0) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }
        return getRoom(roomKey, userId);
    }

    @Override
    @Transactional
    public void deleteRoom(String roomKey, Long userId) {
        var me = requireParticipant(roomKey, userId);
        if (participantRepository.hideRoom(me.getId()) == 0) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }
    }

    @Override
    @Transactional
    public ChatReadResponse markRead(String roomKey, Long userId, long seq) {
        var me = requireParticipant(roomKey, userId);
        if (seq > me.getRoom().getLastSeq()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        if (participantRepository.markRead(me.getId(), seq) == 1) {
            var userIds = participantRepository.findUserIdsByRoomId(me.getRoom().getId());
            events.publishEvent(new ChatReadAdvanced(roomKey, userId, userIds, seq));
            return new ChatReadResponse(seq);
        }
        // 0행: 이미 같거나 더 읽었거나, 그 사이 방이 삭제됐다
        long lastReadSeq = participantRepository.findVisibleLastReadSeq(me.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return new ChatReadResponse(lastReadSeq);
    }

    private ChatParticipant requireParticipant(String roomKey, Long userId) {
        return participantRepository.findByRoomRoomKeyAndUserIdAndHiddenFalse(roomKey, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }
}
