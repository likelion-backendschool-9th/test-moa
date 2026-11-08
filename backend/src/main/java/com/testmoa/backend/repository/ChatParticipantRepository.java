package com.testmoa.backend.repository;

import com.testmoa.backend.entity.ChatParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.List;
import com.testmoa.backend.repository.projection.ChatInboxEntry;
import com.testmoa.backend.repository.projection.ChatRoomEntry;

public interface ChatParticipantRepository extends JpaRepository<ChatParticipant, Long> {
    Optional<ChatParticipant> findByRoomRoomKeyAndUserIdAndHiddenFalse(String roomKey, Long userId);

    @Query("""
            select new com.testmoa.backend.repository.projection.ChatRoomEntry(
                room.roomKey, recruitment.id, project.title, me.customRoomName, project.imageUrl,
                me.role, partnerUser.nickname, partner.role)
            from chat_participants me
            join me.room room
            join room.recruitment recruitment
            join recruitment.project project
            join chat_participants partner on partner.room = room and partner.id <> me.id
            join partner.user partnerUser
            where room.roomKey = :roomKey and me.user.id = :userId and me.hidden = false
            """)
    Optional<ChatRoomEntry> findRoomByRoomKeyAndUserId(@Param("roomKey") String roomKey, @Param("userId") Long userId);

    @Query("""
            select new com.testmoa.backend.repository.projection.ChatInboxEntry(
                room.id, room.roomKey, recruitment.id, project.title, me.customRoomName, project.imageUrl,
                me.role, partnerUser.nickname, partner.role, message.content, room.lastMessageAt)
            from chat_participants me
            join me.room room
            join room.recruitment recruitment
            join recruitment.project project
            join chat_participants partner on partner.room = room and partner.id <> me.id
            join partner.user partnerUser
            left join chat_messages message on message.room = room and message.seq = room.lastSeq
            where me.user.id = :userId and me.hidden = false
            """)
    List<ChatInboxEntry> findInboxByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("update chat_participants p set p.hidden = false where p.room.id = :roomId and p.id <> :senderId and p.hidden = true")
    int unhidePartner(@Param("roomId") Long roomId, @Param("senderId") Long senderId);
}
