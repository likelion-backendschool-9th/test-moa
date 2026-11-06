package com.testmoa.backend.repository;

import com.testmoa.backend.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from chat_rooms r where r.roomKey = :roomKey")
    Optional<ChatRoom> findLockedByRoomKey(@Param("roomKey") String roomKey);

    Optional<ChatRoom> findByRoomKey(String roomKey);
}
