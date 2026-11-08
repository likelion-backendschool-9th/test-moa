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
                me.role, partnerUser.nickname, partner.role, message.content, room.lastMessageAt,
                (select count(unread.id) from chat_messages unread
                 where unread.room = room and unread.seq > me.lastReadSeq and unread.sender.id <> me.id))
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

    @Query("select p.lastReadSeq from chat_participants p where p.id = :id and p.hidden = false")
    Optional<Long> findVisibleLastReadSeq(@Param("id") Long id);

    @Modifying
    @Query("update chat_participants p set p.lastReadSeq = :seq, p.updatedAt = local datetime where p.id = :id and p.hidden = false and p.lastReadSeq < :seq")
    int markRead(@Param("id") Long id, @Param("seq") long seq);

    @Modifying
    @Query("update chat_participants p set p.hidden = false, p.updatedAt = local datetime where p.room.id = :roomId and p.id <> :senderId and p.hidden = true")
    int unhidePartner(@Param("roomId") Long roomId, @Param("senderId") Long senderId);

    @Modifying
    @Query("update chat_participants p set p.customRoomName = :name, p.updatedAt = local datetime where p.id = :id and p.hidden = false")
    int renameRoom(@Param("id") Long id, @Param("name") String name);

    @Modifying
    @Query("update chat_participants p set p.hidden = true, p.updatedAt = local datetime where p.id = :id and p.hidden = false")
    int hideRoom(@Param("id") Long id);
}
