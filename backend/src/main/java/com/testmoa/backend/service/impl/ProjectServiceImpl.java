package com.testmoa.backend.service.impl;

import com.testmoa.backend.domain.dto.request.ProjectSaveRequest;
import com.testmoa.backend.domain.dto.request.RecruitmentCreateRequest;
import com.testmoa.backend.domain.dto.response.ProjectResponse;
import com.testmoa.backend.domain.dto.response.RecruitmentCreateResponse;
import com.testmoa.backend.domain.dto.response.RecruitmentSummaryResponse;
import com.testmoa.backend.domain.entity.Project;
import com.testmoa.backend.domain.entity.Recruitment;
import com.testmoa.backend.domain.entity.RecruitmentType;
import com.testmoa.backend.domain.entity.TestItem;
import com.testmoa.backend.domain.entity.TestItemImage;
import com.testmoa.backend.domain.entity.Type;
import com.testmoa.backend.domain.repository.ProjectRepository;
import com.testmoa.backend.domain.repository.RecruitmentRepository;
import com.testmoa.backend.domain.repository.RecruitmentTypeRepository;
import com.testmoa.backend.domain.repository.RegisterRepository;
import com.testmoa.backend.domain.repository.TestItemImageRepository;
import com.testmoa.backend.domain.repository.TestItemRepository;
import com.testmoa.backend.domain.repository.TypeRepository;
import com.testmoa.backend.domain.repository.UserRepository;
import com.testmoa.backend.global.common.RecruitmentStatus;
import com.testmoa.backend.global.common.RegisterStatus;
import com.testmoa.backend.global.common.SelectionMode;
import com.testmoa.backend.global.common.TypeCode;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.ProjectService;
import com.testmoa.backend.service.SubscriptionChecker;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectServiceImpl implements ProjectService {

    // 마감일과 "오늘"은 한국 시간으로 본다. 서버 시간대와 상관없이 같은 값이 저장된다
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    // 마감일은 그날 끝까지다
    private static final LocalTime END_OF_DAY = LocalTime.of(23, 59, 59);

    private final ProjectRepository projectRepository;
    private final RecruitmentRepository recruitmentRepository;
    private final RecruitmentTypeRepository recruitmentTypeRepository;
    private final RegisterRepository registerRepository;
    private final TestItemRepository testItemRepository;
    private final TestItemImageRepository testItemImageRepository;
    private final TypeRepository typeRepository;
    private final UserRepository userRepository;
    private final SubscriptionChecker subscriptionChecker;

    /**
     * 프로젝트 등록
     */
    @Override
    @Transactional
    public ProjectResponse create(Long userId, ProjectSaveRequest request) {
        Project project = projectRepository.save(Project.builder()
                .user(userRepository.getReferenceById(userId))
                .title(request.name().trim())
                .description(blankToNull(request.description()))
                .imageUrl(blankToNull(request.imageUrl()))
                .build());
        return ProjectResponse.of(project, List.of());
    }

    /**
     * 내 프로젝트 전체와 각자의 모집글
     */
    @Override
    public List<ProjectResponse> findMine(Long userId) {
        return withRecruitments(projectRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId));
    }

    /**
     * 내 프로젝트 하나와 그 모집글
     */
    @Override
    public ProjectResponse findMine(Long userId, Long projectId) {
        return withRecruitments(List.of(findOwned(userId, projectId))).getFirst();
    }

    /**
     * 프로젝트 수정. 설명과 이미지를 비워 보내면 지워진다
     */
    @Override
    @Transactional
    public ProjectResponse update(Long userId, Long projectId, ProjectSaveRequest request) {
        Project project = findOwned(userId, projectId);
        project.update(request.name().trim(), blankToNull(request.description()), blankToNull(request.imageUrl()));
        return withRecruitments(List.of(project)).getFirst();
    }

    /**
     * 모집 작성. 모집글, 유형, 테스트 항목, 항목 이미지를 함께 저장한다. 하나라도 실패하면 모두 저장되지 않는다
     */
    @Override
    @Transactional
    public RecruitmentCreateResponse createRecruitment(Long userId, Long projectId, RecruitmentCreateRequest request) {
        Project project = findOwned(userId, projectId);
        checkDeadlines(request.recruitDeadline(), request.submitDeadline());
        SelectionMode selectionMode = selectionModeOf(request.selectionMode());
        if (selectionMode == SelectionMode.MANUAL && !subscriptionChecker.isActive(userId)) {
            throw invalid("selectionMode", "선발형은 구독 모집에서만 쓸 수 있어요");
        }

        Recruitment recruitment = recruitmentRepository.save(Recruitment.builder()
                .project(project)
                .title(request.title().trim())
                .description(request.description().trim())
                .conditions(blankToNull(request.conditions()))
                .accessUrl(request.accessUrl().trim())
                .recruitDeadline(endOf(request.recruitDeadline()))
                .feedbackDeadline(endOf(request.submitDeadline()))
                .selectionMode(selectionMode)
                .build());
        recruitmentTypeRepository.save(RecruitmentType.builder().recruitment(recruitment).type(findOrCreateType(TypeCode.WEB)).build());
        request.testItems().forEach(item -> saveTestItem(recruitment, item));
        return new RecruitmentCreateResponse(recruitment.getId());
    }

    private Project findOwned(Long userId, Long projectId) {
        return projectRepository.findByIdAndUserId(projectId, userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    // 프로젝트들의 모집글, 유형, 확정 수를 한 번에 읽어 묶는다
    private List<ProjectResponse> withRecruitments(List<Project> projects) {
        List<Long> projectIds = projects.stream().map(Project::getId).toList();
        List<Recruitment> recruitments = recruitmentRepository.findByProjectIdInOrderByCreatedAtDescIdDesc(projectIds);
        List<Long> recruitmentIds = recruitments.stream().map(Recruitment::getId).toList();

        Map<Long, TypeCode> types = recruitmentTypeRepository.findByRecruitmentIdIn(recruitmentIds).stream()
                .collect(Collectors.toMap(item -> item.getRecruitment().getId(), item -> item.getType().getCode(), (first, second) -> first));
        Map<Long, Long> confirmed = registerRepository.countByRecruitmentIds(recruitmentIds, RegisterStatus.CONFIRMED).stream()
                .collect(Collectors.toMap(RegisterRepository.RecruitmentCount::getRecruitmentId, RegisterRepository.RecruitmentCount::getCount));

        LocalDateTime now = LocalDateTime.now(SEOUL);
        Map<Long, List<RecruitmentSummaryResponse>> byProject = recruitments.stream().collect(Collectors.groupingBy(
                item -> item.getProject().getId(),
                Collectors.mapping(item -> RecruitmentSummaryResponse.of(
                        item,
                        statusOf(item, now),
                        selectionModeName(item.getSelectionMode()),
                        softwareTypeName(types.get(item.getId())),
                        confirmed.getOrDefault(item.getId(), 0L)), Collectors.toList())));

        return projects.stream()
                .map(project -> ProjectResponse.of(project, byProject.getOrDefault(project.getId(), List.of())))
                .toList();
    }

    // 모집 상태. 취소만 저장된 값을 쓰고, 나머지는 프론트처럼 마감일로 계산한다
    private String statusOf(Recruitment recruitment, LocalDateTime now) {
        if (recruitment.getStatus() == RecruitmentStatus.CANCELLED) return "cancelled";
        if (now.isBefore(recruitment.getRecruitDeadline())) return "recruiting";
        return now.isBefore(recruitment.getFeedbackDeadline()) ? "testing" : "closed";
    }

    // 모집 마감은 오늘부터, 제출 마감은 모집 마감 뒤여야 한다
    private void checkDeadlines(LocalDate recruitDeadline, LocalDate submitDeadline) {
        if (recruitDeadline.isBefore(LocalDate.now(SEOUL))) {
            throw invalid("recruitDeadline", "모집 마감일은 오늘 이후로 골라 주세요");
        }
        if (!submitDeadline.isAfter(recruitDeadline)) {
            throw invalid("submitDeadline", "제출 마감일은 모집 마감일보다 뒤여야 해요");
        }
    }

    private void saveTestItem(Recruitment recruitment, RecruitmentCreateRequest.TestItemRequest item) {
        TestItem testItem = testItemRepository.save(TestItem.builder()
                .recruitment(recruitment)
                .title(item.title().trim())
                .description(blankToNull(item.description()))
                .required(item.required())
                .build());
        List<String> imageUrls = item.imageUrls() == null ? List.of() : item.imageUrls();
        for (int index = 0; index < imageUrls.size(); index++) {
            testItemImageRepository.save(TestItemImage.builder().testItem(testItem).url(imageUrls.get(index)).sortOrder(index).build());
        }
    }

    // 유형은 처음 쓸 때 만든다. 앱 시작 때 만들면 테이블이 없는 환경에서 앱이 뜨지 못한다
    private Type findOrCreateType(TypeCode code) {
        return typeRepository.findByCode(code).orElseGet(() -> typeRepository.save(Type.builder().code(code).build()));
    }

    private LocalDateTime endOf(LocalDate date) {
        return date.atTime(END_OF_DAY);
    }

    private SelectionMode selectionModeOf(String value) {
        return "selection".equals(value) ? SelectionMode.MANUAL : SelectionMode.FIRST_COME;
    }

    private String selectionModeName(SelectionMode selectionMode) {
        return selectionMode == SelectionMode.MANUAL ? "selection" : "firstCome";
    }

    private String softwareTypeName(TypeCode code) {
        return code == null ? null : code.name().toLowerCase();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private BusinessException invalid(String field, String message) {
        return new BusinessException(ErrorCode.INVALID_INPUT, ErrorCode.INVALID_INPUT.getMessage(), Map.of(field, message));
    }
}
