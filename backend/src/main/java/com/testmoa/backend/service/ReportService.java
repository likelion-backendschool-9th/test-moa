package com.testmoa.backend.service;

import com.testmoa.backend.dto.request.ReportCreateRequest;
import com.testmoa.backend.dto.response.ReportResponse;
import com.testmoa.backend.entity.Feedback;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 회원 신고(#85)
 */
public interface ReportService {
    // 신고를 받는다. 신고당한 회원은 대상에서 찾고, 자기 신고와 검토 중인 같은 대상 중복 신고는 막는다
    ReportResponse create(Long userId, ReportCreateRequest request, List<MultipartFile> files);

    // 내 신고 목록, 최신순
    List<ReportResponse> getMine(Long userId);

    // 피드백 신고 API(#175)가 피드백을 신고할 때 신고 행을 함께 남긴다. 신고당한 회원은 그 피드백을 쓴 테스터
    void recordFeedbackReport(Long reporterId, Feedback feedback, String reason);

    // 증거 파일. 신고한 본인과 운영자만 열 수 있고, 그 밖에는 없는 파일처럼 404
    EvidenceFile getEvidence(Long userId, boolean admin, Long reportId, Long evidenceId);

    record EvidenceFile(Resource resource, String contentType, String originalName) {}
}
