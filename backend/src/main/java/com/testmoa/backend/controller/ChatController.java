package com.testmoa.backend.controller;

import com.testmoa.backend.domain.dto.request.ChatMessageSendRequest;
import com.testmoa.backend.domain.dto.response.*;
import com.testmoa.backend.global.common.ApiResponse;
import com.testmoa.backend.service.ChatService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/chats/{roomKey}")
public class ChatController {
    private final ChatService chatService;

    @GetMapping
    public ApiResponse<ChatRoomResponse> getRoom(@PathVariable String roomKey,
                                                @AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(chatService.getRoom(roomKey, userId));
    }

    @GetMapping("/messages")
    public ApiResponse<ChatMessageSliceResponse> getMessages(@PathVariable String roomKey,
            @AuthenticationPrincipal Long userId, @RequestParam(required = false) @Min(1) Long before) {
        return ApiResponse.ok(chatService.getMessages(roomKey, userId, before));
    }

    @PostMapping("/messages")
    public ApiResponse<ChatMessageResponse> sendMessage(@PathVariable String roomKey,
            @AuthenticationPrincipal Long userId, @Valid @RequestBody ChatMessageSendRequest request) {
        return ApiResponse.ok(chatService.sendMessage(roomKey, userId, request.text()));
    }
}
