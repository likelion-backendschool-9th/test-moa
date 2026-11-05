package com.testmoa.backend.controller;

import com.testmoa.backend.domain.dto.response.MeResponse;
import com.testmoa.backend.global.common.ApiResponse;
import com.testmoa.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @Operation(summary = "내 정보", description = "로그인 필요. 구독 상태(subscription.active)를 함께 준다")
    @GetMapping("/me")
    public ApiResponse<MeResponse> getMe(@Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(userService.getMe(userId));
    }
}
