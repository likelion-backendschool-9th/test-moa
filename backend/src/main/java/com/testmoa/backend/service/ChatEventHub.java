package com.testmoa.backend.service;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@EnableScheduling
@Slf4j
public class ChatEventHub {
    private final Map<Long, List<SseEmitter>> connections = new HashMap<>();
    private final long timeoutMillis;
    private final int maxConnections;

    public ChatEventHub(@Value("${chat.sse.timeout}") Duration timeout,
                        @Value("${chat.sse.max-connections}") int maxConnections) {
        if (timeout.isNegative() || timeout.isZero() || maxConnections < 1) {
            throw new IllegalArgumentException("SSE 연결 시간과 연결 수는 양수여야 합니다");
        }
        this.timeoutMillis = timeout.toMillis();
        this.maxConnections = maxConnections;
    }

    public synchronized SseEmitter connect(Long userId) {
        var emitter = new SseEmitter(timeoutMillis);
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> close(userId, emitter));
        emitter.onError(error -> remove(userId, emitter));
        // ready를 먼저 넣어 등록 직후의 알림보다 먼저 전달되게 한다.
        try {
            emitter.send(SseEmitter.event().reconnectTime(3000).name("ready").data(Map.of()));
        } catch (IOException | IllegalStateException error) {
            emitter.complete();
            return emitter;
        }
        var list = connections.computeIfAbsent(userId, ignored -> new ArrayList<>());
        list.add(emitter);
        if (list.size() > maxConnections) {
            var oldest = list.removeFirst();
            oldest.complete();
        }
        return emitter;
    }

    public void send(Long userId, String name, Object data) {
        for (var emitter : snapshot(userId)) {
            deliver(userId, emitter, SseEmitter.event().name(name).data(data));
        }
    }

    @Scheduled(fixedDelayString = "${chat.sse.heartbeat}")
    public void heartbeat() {
        Map<Long, List<SseEmitter>> snapshot;
        synchronized (this) {
            snapshot = new HashMap<>();
            connections.forEach((id, list) -> snapshot.put(id, List.copyOf(list)));
        }
        snapshot.forEach((id, list) -> list.forEach(emitter ->
                deliver(id, emitter, SseEmitter.event().comment("heartbeat"))));
    }

    private void deliver(Long userId, SseEmitter emitter, SseEmitter.SseEventBuilder event) {
        try {
            emitter.send(event);
        } catch (IOException | IllegalStateException error) {
            remove(userId, emitter);
        }
    }

    private synchronized List<SseEmitter> snapshot(Long userId) {
        return List.copyOf(connections.getOrDefault(userId, List.of()));
    }

    public synchronized int connectionCount(Long userId) {
        return connections.getOrDefault(userId, List.of()).size();
    }

    private synchronized void remove(Long userId, SseEmitter emitter) {
        var list = connections.get(userId);
        if (list != null && list.remove(emitter)) {
            if (list.isEmpty()) connections.remove(userId);
            log.info("채팅 SSE 연결 종료: userId={}", userId);
        }
    }

    private void close(Long userId, SseEmitter emitter) {
        remove(userId, emitter);
        emitter.complete();
    }

    @PreDestroy
    public synchronized void shutdown() {
        var emitters = connections.values().stream().flatMap(List::stream).toList();
        connections.clear();
        emitters.forEach(SseEmitter::complete);
    }
}
