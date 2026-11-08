package com.testmoa.backend.controller;

import com.testmoa.backend.dto.request.ChatMessageSendRequest;
import com.testmoa.backend.dto.request.ChatRoomRenameRequest;
import com.testmoa.backend.dto.request.ChatInboxQuery;
import com.testmoa.backend.dto.request.ChatReadRequest;
import com.testmoa.backend.dto.response.ChatReadResponse;
import com.testmoa.backend.dto.response.ChatInboxResponse;
import com.testmoa.backend.dto.response.ChatMessageResponse;
import com.testmoa.backend.dto.response.ChatMessageSliceResponse;
import com.testmoa.backend.dto.response.ChatRoomResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.ChatService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/chats")
public class ChatController {
    private final ChatService chatService;

    @GetMapping
    public ApiResponse<ChatInboxResponse> getInbox(@AuthenticationPrincipal Long userId,
                                                   @ModelAttribute ChatInboxQuery query) {
        return ApiResponse.ok(chatService.getInbox(userId, query));
    }

    @GetMapping("/{roomKey}")
    public ApiResponse<ChatRoomResponse> getRoom(@PathVariable String roomKey,
                                                 @AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(chatService.getRoom(roomKey, userId));
    }

    @GetMapping("/{roomKey}/messages")
    public ApiResponse<ChatMessageSliceResponse> getMessages(@PathVariable String roomKey,
                                                             @AuthenticationPrincipal Long userId, @RequestParam(required = false) @Min(1) Long before) {
        return ApiResponse.ok(chatService.getMessages(roomKey, userId, before));
    }

    @PostMapping("/{roomKey}/messages")
    public ApiResponse<ChatMessageResponse> sendMessage(@PathVariable String roomKey,
                                                        @AuthenticationPrincipal Long userId, @Valid @RequestBody ChatMessageSendRequest request) {
        return ApiResponse.ok(chatService.sendMessage(roomKey, userId, request.text()));
    }

    @PostMapping("/{roomKey}/read")
    public ApiResponse<ChatReadResponse> markRead(@PathVariable String roomKey,
                                                  @AuthenticationPrincipal Long userId,
                                                  @Valid @RequestBody ChatReadRequest request) {
        return ApiResponse.ok(chatService.markRead(roomKey, userId, request.seq()));
    }

    @PatchMapping("/{roomKey}")
    public ApiResponse<ChatRoomResponse> renameRoom(@PathVariable String roomKey,
                                                   @AuthenticationPrincipal Long userId,
                                                   @Valid @RequestBody ChatRoomRenameRequest request) {
        return ApiResponse.ok(chatService.renameRoom(roomKey, userId, request.name()));
    }

    @DeleteMapping("/{roomKey}")
    public ApiResponse<Void> deleteRoom(@PathVariable String roomKey,
                                         @AuthenticationPrincipal Long userId) {
        chatService.deleteRoom(roomKey, userId);
        return ApiResponse.ok();
    }
}
