package com.testmoa.backend.service;

import com.testmoa.backend.entity.ChatRoom;
import com.testmoa.backend.support.ChatFixtures;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class ChatSendConcurrencyTest {
    @Autowired EntityManager em;
    @Autowired ChatService service;
    @Autowired PlatformTransactionManager transactionManager;

    record RoomData(Long roomId, String roomKey, Long developerId, Long testerId, Long recruitmentId,
                    Long registerId, Long projectId, Long subscriptionId, Long planId) {}

    @Test
    @DisplayName("#49-S10 두 참여자가 동시에 10개씩 보내도 순번 1~20이 빠짐없이 저장된다")
    void concurrentSend() throws Exception {
        var tx = new TransactionTemplate(transactionManager);
        RoomData data = tx.execute(status -> {
            var fixtures = new ChatFixtures(em);
            var developer = fixtures.user("동시개발자");
            var subscription = fixtures.subscribe(developer);
            var tester = fixtures.user("동시테스터");
            var recruitment = fixtures.recruitment(developer, "동시전송 프로젝트");
            var register = fixtures.confirmedRegister(recruitment, tester);
            var room = ChatRoom.builder().register(register).build();
            em.persist(room);
            return new RoomData(room.getId(), room.getRoomKey(), developer.getId(), tester.getId(),
                    recruitment.getId(), register.getId(), recruitment.getProject().getId(), subscription.getId(), subscription.getPlan().getId());
        });
        try {
            try (var executor = Executors.newFixedThreadPool(2)) {
                var ready = new CountDownLatch(2);
                var start = new CountDownLatch(1);
                var first = executor.submit(() -> sendTen(data, data.developerId(), ready, start));
                var second = executor.submit(() -> sendTen(data, data.testerId(), ready, start));
                try {
                    assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
                } finally {
                    start.countDown();
                }
                assertThat(first.get(30, TimeUnit.SECONDS)).isEqualTo(10);
                assertThat(second.get(30, TimeUnit.SECONDS)).isEqualTo(10);
            }
            tx.executeWithoutResult(status -> {
                var sequences = em.createQuery("select m.seq from chat_messages m where m.room.id = :id order by m.seq", Long.class)
                        .setParameter("id", data.roomId()).getResultList();
                assertThat(sequences).containsExactlyElementsOf(LongStream.rangeClosed(1, 20).boxed().toList());
                assertThat(em.find(ChatRoom.class, data.roomId()).getLastSeq()).isEqualTo(20);
            });
        } finally {
            tx.executeWithoutResult(status -> {
                em.createQuery("delete from chat_messages m where m.room.id = :id").setParameter("id", data.roomId()).executeUpdate();
                em.createQuery("delete from chat_participants p where p.room.id = :id").setParameter("id", data.roomId()).executeUpdate();
                em.createQuery("delete from chat_rooms r where r.id = :id").setParameter("id", data.roomId()).executeUpdate();
                em.createQuery("delete from registers r where r.id = :id").setParameter("id", data.registerId()).executeUpdate();
                em.createQuery("delete from recruitments r where r.id = :id").setParameter("id", data.recruitmentId()).executeUpdate();
                em.createQuery("delete from projects p where p.id = :id").setParameter("id", data.projectId()).executeUpdate();
                em.createQuery("delete from subscriptions s where s.id = :id").setParameter("id", data.subscriptionId()).executeUpdate();
                em.createQuery("delete from plans p where p.id = :id").setParameter("id", data.planId()).executeUpdate();
                em.createQuery("delete from users u where u.id in :ids")
                        .setParameter("ids", java.util.List.of(data.developerId(), data.testerId())).executeUpdate();
            });
        }
    }

    private int sendTen(RoomData room, Long userId, CountDownLatch ready, CountDownLatch start) {
        ready.countDown();
        try {
            if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("동시 전송 시작 대기 초과");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
        for (int i = 0; i < 10; i++) service.sendMessage(room.roomKey(), userId, "동시 메시지" + i);
        return 10;
    }
}
