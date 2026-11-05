package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.ChatParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface ChatParticipantRepository extends JpaRepository<ChatParticipant, Long> {
    Optional<ChatParticipant> findByRoomRoomKeyAndUserIdAndHiddenFalse(String roomKey, Long userId);

    @Modifying
    @Query("update chat_participants p set p.hidden = false where p.room.id = :roomId and p.id <> :senderId and p.hidden = true")
    int unhidePartner(@Param("roomId") Long roomId, @Param("senderId") Long senderId);
}
