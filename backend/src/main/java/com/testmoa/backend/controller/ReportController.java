package com.testmoa.backend.controller;

import com.testmoa.backend.dto.request.ReportCreateRequest;
import com.testmoa.backend.dto.response.ReportResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.ReportService;
import com.testmoa.backend.service.ReportService.EvidenceFile;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * 회원 신고(#85). 로그인이 필요하고, 신고한 회원 id는 토큰에서 꺼낸다
 */
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {
    private final ReportService reportService;

    @Operation(summary = "신고하기", description = "multipart. targetType(RECRUITMENT·USER·CHAT), 모집 글·회원은 targetId, 채팅은 roomKey, reason, files(PNG·JPG·WEBP·PDF, 한 장 5MB, 5장까지)")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ReportResponse> create(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                              @Valid @ModelAttribute ReportCreateRequest request,
                                              @RequestParam(value = "files", required = false) List<MultipartFile> files) {
        return ApiResponse.ok(reportService.create(userId, request, files));
    }

    @Operation(summary = "신고 증거 파일", description = "신고한 본인과 운영자만 연다. 그 밖에는 404")
    @GetMapping("/{reportId}/evidences/{evidenceId}")
    public ResponseEntity<Resource> evidence(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                             @Parameter(hidden = true) Authentication authentication,
                                             @PathVariable Long reportId,
                                             @PathVariable Long evidenceId) {
        boolean admin = authentication.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        EvidenceFile file = reportService.getEvidence(userId, admin, reportId, evidenceId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(file.originalName(), StandardCharsets.UTF_8).build().toString())
                // 증거는 개인 정보라 브라우저·중간 서버에 남기지 않는다
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(file.resource());
    }
}
