package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.request.ReportCreateRequest;
import com.testmoa.backend.dto.response.ReportResponse;
import com.testmoa.backend.entity.ChatParticipant;
import com.testmoa.backend.entity.Report;
import com.testmoa.backend.entity.ReportEvidence;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.ReportStatus;
import com.testmoa.backend.entity.enums.ReportTargetType;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.file.FileStorage;
import com.testmoa.backend.global.file.FileStorage.Kind;
import com.testmoa.backend.repository.ChatParticipantRepository;
import com.testmoa.backend.repository.RecruitmentRepository;
import com.testmoa.backend.repository.ReportEvidenceRepository;
import com.testmoa.backend.repository.ReportRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    static final int MAX_FILES = 5;
    static final long MAX_FILE_BYTES = 5L * 1024 * 1024;
    private static final String FOLDER = "reports";

    private final ReportRepository reportRepository;
    private final ReportEvidenceRepository evidenceRepository;
    private final UserRepository userRepository;
    private final RecruitmentRepository recruitmentRepository;
    private final ChatParticipantRepository participantRepository;
    private final FileStorage fileStorage;

    // 신고 대상: 신고당한 회원과 저장할 대상 id
    private record Target(User reportedUser, Long targetId) {}

    // 검사를 통과한 증거 파일과 확인한 종류
    private record Upload(MultipartFile file, Kind kind) {}

    @Override
    @Transactional
    public ReportResponse create(Long userId, ReportCreateRequest request, List<MultipartFile> files) {
        // 신고자 행을 잠가 같은 회원의 신고를 한 번에 하나씩 처리한다. 동시에 같은 대상을 신고해도 중복 확인과 저장 사이에 끼어들지 못한다
        User reporter = userRepository.findByIdForUpdate(userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        Target target = findTarget(userId, request);
        if (target.reportedUser().getId().equals(userId)) throw new BusinessException(ErrorCode.REPORT_SELF);
        if (reportRepository.existsByReporterIdAndTargetTypeAndTargetIdAndStatus(
                userId, request.targetType(), target.targetId(), ReportStatus.PENDING)) {
            throw new BusinessException(ErrorCode.REPORT_DUPLICATED);
        }
        // 파일을 하나도 저장하기 전에 모두 검사한다
        List<Upload> uploads = checkFiles(files);

        Report report = reportRepository.save(Report.builder()
                .reporter(reporter)
                .reportedUser(target.reportedUser())
                .targetType(request.targetType())
                .targetId(target.targetId())
                .reason(request.reason().trim())
                .build());

        List<String> saved = deleteOnRollback();
        List<ReportEvidence> evidences = new ArrayList<>();
        for (int i = 0; i < uploads.size(); i++) {
            Upload upload = uploads.get(i);
            FileStorage.Stored stored = fileStorage.save(FOLDER, upload.file(), upload.kind());
            saved.add(stored.path());
            evidences.add(evidenceRepository.save(ReportEvidence.builder()
                    .report(report)
                    .storedPath(stored.path())
                    .originalName(originalName(upload.file(), i))
                    .contentType(stored.kind().contentType())
                    .size(stored.size())
                    .sortOrder(i)
                    .build()));
        }
        return ReportResponse.of(report, evidences);
    }

    /**
     * 저장한 파일 목록. 트랜잭션이 최종적으로 커밋되지 않으면(메서드 안의 예외, 커밋 실패, 바깥 트랜잭션의 롤백) 목록의 파일을 지운다
     */
    private List<String> deleteOnRollback() {
        List<String> saved = new ArrayList<>();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) saved.forEach(fileStorage::delete);
            }
        });
        return saved;
    }

    @Override
    public EvidenceFile getEvidence(Long userId, boolean admin, Long reportId, Long evidenceId) {
        ReportEvidence evidence = evidenceRepository.findByIdAndReportId(evidenceId, reportId)
                .filter(found -> admin || found.getReport().getReporter().getId().equals(userId))
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return fileStorage.load(evidence.getStoredPath())
                .map(resource -> new EvidenceFile(resource, evidence.getContentType(), evidence.getOriginalName()))
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    /**
     * 신고당한 회원을 대상에서 찾는다. 모집 글은 프로젝트 주인, 회원은 그 회원, 채팅은 방의 상대 참여자.
     * 피드백은 피드백 신고 API(#175)가 받는다
     */
    private Target findTarget(Long userId, ReportCreateRequest request) {
        return switch (request.targetType()) {
            case FEEDBACK -> throw fieldError("targetType", "피드백 신고는 피드백 화면에서 해 주세요");
            case RECRUITMENT -> recruitmentRepository.findById(requireTargetId(request))
                    .map(recruitment -> new Target(recruitment.getProject().getUser(), recruitment.getId()))
                    .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
            case USER -> userRepository.findById(requireTargetId(request))
                    .map(user -> new Target(user, user.getId()))
                    .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
            case CHAT -> {
                if (request.roomKey() == null || request.roomKey().isBlank()) throw fieldError("roomKey", "신고할 채팅방을 골라 주세요");
                // 내가 참여한 방만 신고할 수 있다. 다른 방은 있는지도 알리지 않는다
                ChatParticipant me = participantRepository.findByRoomRoomKeyAndUserIdAndHiddenFalse(request.roomKey(), userId)
                        .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
                User partner = me.getRoom().getParticipants().stream()
                        .map(ChatParticipant::getUser)
                        .filter(user -> !user.getId().equals(userId))
                        .findFirst()
                        .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
                yield new Target(partner, me.getRoom().getId());
            }
        };
    }

    private static Long requireTargetId(ReportCreateRequest request) {
        if (request.targetId() == null) throw fieldError("targetId", "신고할 대상을 골라 주세요");
        return request.targetId();
    }

    // 빈 칸으로 온 파일은 없는 것으로 본다. 개수·크기·종류를 모두 확인한다
    private static List<Upload> checkFiles(List<MultipartFile> files) {
        List<MultipartFile> present = files == null ? List.of() : files.stream().filter(file -> !file.isEmpty()).toList();
        if (present.size() > MAX_FILES) throw fieldError("files", "증거 파일은 5장까지 올릴 수 있어요");
        List<Upload> uploads = new ArrayList<>();
        for (MultipartFile file : present) {
            if (file.getSize() > MAX_FILE_BYTES) throw fieldError("files", "파일은 한 장 5MB까지 올릴 수 있어요");
            Kind kind = FileStorage.detect(file)
                    .orElseThrow(() -> fieldError("files", "PNG·JPG·WEBP·PDF 파일만 올릴 수 있어요"));
            uploads.add(new Upload(file, kind));
        }
        return uploads;
    }

    // 원래 이름은 내려받을 때만 쓴다. 경로 문자는 빼고 길이를 줄인다
    private static String originalName(MultipartFile file, int index) {
        String name = file.getOriginalFilename();
        if (name == null || name.isBlank()) return "evidence-" + (index + 1);
        name = name.replaceAll("[\\\\/]", "_");
        return name.length() > 200 ? name.substring(name.length() - 200) : name;
    }

    private static BusinessException fieldError(String field, String message) {
        return new BusinessException(ErrorCode.INVALID_INPUT, message, Map.of(field, message));
    }
}
