package com.testmoa.backend.controller;

import com.testmoa.backend.dto.request.ChatInboxQuery;
import com.testmoa.backend.dto.request.ChatMessageSendRequest;
import com.testmoa.backend.dto.request.ChatReadRequest;
import com.testmoa.backend.dto.request.ChatRoomRenameRequest;
import com.testmoa.backend.dto.request.ChatStartRequest;
import com.testmoa.backend.dto.response.ChatInboxResponse;
import com.testmoa.backend.dto.response.ChatMessageResponse;
import com.testmoa.backend.dto.response.ChatMessageSearchResponse;
import com.testmoa.backend.dto.response.ChatMessageSliceResponse;
import com.testmoa.backend.dto.response.ChatReadResponse;
import com.testmoa.backend.dto.response.ChatRoomResponse;
import com.testmoa.backend.dto.response.ChatStartResponse;
import com.testmoa.backend.dto.response.ChatUnreadResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.ChatService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/chats")
public class ChatController {
    private final ChatService chatService;

    @PostMapping
    public ResponseEntity<ApiResponse<ChatStartResponse>> startChat(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody ChatStartRequest request) {
        var result = chatService.startChat(userId, request.registerId());
        return ResponseEntity.status(result.created() ? 201 : 200)
                .body(ApiResponse.ok(result.response()));
    }

    @GetMapping
    public ApiResponse<ChatInboxResponse> getInbox(@AuthenticationPrincipal Long userId,
                                                   @ModelAttribute ChatInboxQuery query) {
        return ApiResponse.ok(chatService.getInbox(userId, query));
    }

    @GetMapping("/unread")
    public ApiResponse<ChatUnreadResponse> getUnread(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(chatService.getUnread(userId));
    }

    @GetMapping("/{roomKey}")
    public ApiResponse<ChatRoomResponse> getRoom(@PathVariable String roomKey,
                                                 @AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(chatService.getRoom(roomKey, userId));
    }

    @GetMapping("/{roomKey}/messages")
    public ApiResponse<ChatMessageSliceResponse> getMessages(@PathVariable String roomKey,
                                                             @AuthenticationPrincipal Long userId, @RequestParam(required = false) @Min(1) Long before,
                                                             @RequestParam(required = false) @Min(0) Long after,
                                                             @RequestParam(required = false) @Min(1) Long from) {
        return ApiResponse.ok(chatService.getMessages(roomKey, userId, before, after, from));
    }

    /** 검색어(100자 이하, 앞뒤 공백 제외 1자 이상)가 들어간 메시지의 순번을 최신부터 최대 100개 */
    @GetMapping("/{roomKey}/messages/search")
    public ApiResponse<ChatMessageSearchResponse> searchMessages(@PathVariable String roomKey,
                                                                 @AuthenticationPrincipal Long userId,
                                                                 @RequestParam @NotBlank @Size(max = 100) String q) {
        return ApiResponse.ok(chatService.searchMessages(roomKey, userId, q));
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
