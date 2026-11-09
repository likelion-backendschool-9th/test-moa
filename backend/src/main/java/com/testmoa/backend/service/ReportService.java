package com.testmoa.backend.service;

import com.testmoa.backend.dto.request.ReportCreateRequest;
import com.testmoa.backend.dto.response.ReportResponse;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 회원 신고(#85)
 */
public interface ReportService {
    // 신고를 받는다. 신고당한 회원은 대상에서 찾고, 자기 신고와 검토 중인 같은 대상 중복 신고는 막는다
    ReportResponse create(Long userId, ReportCreateRequest request, List<MultipartFile> files);

    // 증거 파일. 신고한 본인과 운영자만 열 수 있고, 그 밖에는 없는 파일처럼 404
    EvidenceFile getEvidence(Long userId, boolean admin, Long reportId, Long evidenceId);

    record EvidenceFile(Resource resource, String contentType, String originalName) {}
}
