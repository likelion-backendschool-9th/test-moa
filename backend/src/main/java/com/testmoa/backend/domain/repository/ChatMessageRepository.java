package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.ChatMessage;
import com.testmoa.backend.domain.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByRoomOrderBySeqAsc(ChatRoom room);
}
