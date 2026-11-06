package com.testmoa.backend.repository;

import com.testmoa.backend.entity.ChatMessage;
import com.testmoa.backend.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    Slice<ChatMessage> findByRoomOrderBySeqDesc(ChatRoom room, Pageable pageable);
    Slice<ChatMessage> findByRoomAndSeqLessThanOrderBySeqDesc(ChatRoom room, long before, Pageable pageable);

    List<ChatMessage> findByRoomOrderBySeqAsc(ChatRoom room);
}
