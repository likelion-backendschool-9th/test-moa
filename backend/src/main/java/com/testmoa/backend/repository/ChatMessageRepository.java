package com.testmoa.backend.repository;

import com.testmoa.backend.entity.ChatMessage;
import com.testmoa.backend.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import org.springframework.data.domain.Limit;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    Slice<ChatMessage> findByRoomOrderBySeqDesc(ChatRoom room, Pageable pageable);
    Slice<ChatMessage> findByRoomAndSeqLessThanOrderBySeqDesc(ChatRoom room, long before, Pageable pageable);

    Slice<ChatMessage> findByRoomAndSeqGreaterThanOrderBySeqAsc(ChatRoom room, long after, Pageable pageable);

    List<ChatMessage> findByRoomOrderBySeqAsc(ChatRoom room);

    /** 내용(소문자)이 패턴과 맞는 메시지의 순번을 최신부터. 패턴은 LikePattern.contains로 만든 소문자 값이다 */
    @Query("select m.seq from chat_messages m where m.room = :room and lower(m.content) like :pattern escape '\\' order by m.seq desc")
    List<Long> findSeqsByContent(@Param("room") ChatRoom room, @Param("pattern") String pattern, Limit limit);
}
