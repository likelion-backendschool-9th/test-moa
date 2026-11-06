package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.ChatMessage;
import com.testmoa.backend.domain.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    Slice<ChatMessage> findByRoomOrderBySeqDesc(ChatRoom room, Pageable pageable);
    Slice<ChatMessage> findByRoomAndSeqLessThanOrderBySeqDesc(ChatRoom room, long before, Pageable pageable);

    List<ChatMessage> findByRoomOrderBySeqAsc(ChatRoom room);
}
