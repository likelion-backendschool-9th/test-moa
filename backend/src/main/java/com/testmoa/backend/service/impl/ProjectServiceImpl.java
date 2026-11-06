package com.testmoa.backend.service.impl;

import com.testmoa.backend.domain.dto.request.ProjectSaveRequest;
import com.testmoa.backend.domain.dto.request.RecruitmentCreateRequest;
import com.testmoa.backend.domain.dto.response.ProjectResponse;
import com.testmoa.backend.domain.dto.response.RecruitmentCreateResponse;
import com.testmoa.backend.domain.dto.response.RecruitmentSummaryResponse;
import com.testmoa.backend.domain.entity.Project;
import com.testmoa.backend.domain.entity.Recruitment;
import com.testmoa.backend.domain.entity.RecruitmentImage;
import com.testmoa.backend.domain.entity.RecruitmentType;
import com.testmoa.backend.domain.entity.TestItem;
import com.testmoa.backend.domain.entity.TestItemImage;
import com.testmoa.backend.domain.entity.Type;
import com.testmoa.backend.domain.repository.ProjectRepository;
import com.testmoa.backend.domain.repository.RecruitmentImageRepository;
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

    // 마감일과 "오늘"은 한국 날짜로 본다. 저장과 비교는 다른 코드처럼 서버 시간대(LocalDateTime.now())를 쓴다
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    // 마감일은 한국 시간으로 그날 끝까지다
    private static final LocalTime END_OF_DAY = LocalTime.of(23, 59, 59);

    private final ProjectRepository projectRepository;
    private final RecruitmentRepository recruitmentRepository;
    private final RecruitmentImageRepository recruitmentImageRepository;
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
        return ProjectResponse.of(project, 0, 0);
    }

    /**
     * 내 프로젝트 전체와 각자의 모집 수
     */
    @Override
    public List<ProjectResponse> findMine(Long userId) {
        return withCounts(projectRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId));
    }

    /**
     * 내 프로젝트 하나
     */
    @Override
    public ProjectResponse findMine(Long userId, Long projectId) {
        return withCounts(List.of(findOwned(userId, projectId))).getFirst();
    }

    /**
     * 내 프로젝트의 모집 건 전체. 최신순
     */
    @Override
    public List<RecruitmentSummaryResponse> findRecruitments(Long userId, Long projectId) {
        findOwned(userId, projectId);
        List<Recruitment> recruitments = recruitmentRepository.findByProjectIdInOrderByCreatedAtDescIdDesc(List.of(projectId));
        List<Long> recruitmentIds = recruitments.stream().map(Recruitment::getId).toList();

        Map<Long, TypeCode> types = recruitmentTypeRepository.findByRecruitmentIdIn(recruitmentIds).stream()
                .collect(Collectors.toMap(item -> item.getRecruitment().getId(), item -> item.getType().getCode(), (first, second) -> first));
        Map<Long, Long> confirmed = registerRepository.countByRecruitmentIds(recruitmentIds, RegisterStatus.CONFIRMED).stream()
                .collect(Collectors.toMap(RegisterRepository.RecruitmentCount::getRecruitmentId, RegisterRepository.RecruitmentCount::getCount));

        LocalDateTime now = LocalDateTime.now();
        return recruitments.stream().map(item -> RecruitmentSummaryResponse.of(
                item,
                statusOf(item, now),
                selectionModeName(item.getSelectionMode()),
                softwareTypeName(types.get(item.getId())),
                confirmed.getOrDefault(item.getId(), 0L))).toList();
    }

    /**
     * 프로젝트 수정. 설명과 이미지를 비워 보내면 지워진다
     */
    @Override
    @Transactional
    public ProjectResponse update(Long userId, Long projectId, ProjectSaveRequest request) {
        Project project = findOwned(userId, projectId);
        project.update(request.name().trim(), blankToNull(request.description()), blankToNull(request.imageUrl()));
        return withCounts(List.of(project)).getFirst();
    }

    /**
     * 모집 작성. 모집글, 모집글 이미지, 유형, 테스트 항목, 항목 이미지를 함께 저장한다. 하나라도 실패하면 모두 저장되지 않는다
     */
    @Override
    @Transactional
    public RecruitmentCreateResponse createRecruitment(Long userId, RecruitmentCreateRequest request) {
        Project project = findOwned(userId, request.projectId());
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
        saveRecruitmentImages(recruitment, request.imageUrls());
        recruitmentTypeRepository.save(RecruitmentType.builder().recruitment(recruitment).type(findOrCreateType(TypeCode.WEB)).build());
        request.testItems().forEach(item -> saveTestItem(recruitment, item));
        return new RecruitmentCreateResponse(recruitment.getId());
    }

    private Project findOwned(Long userId, Long projectId) {
        return projectRepository.findByIdAndUserId(projectId, userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    // 프로젝트마다 모집 수와 모집 중인 수를 센다. 취소한 모집은 세지 않는다
    private List<ProjectResponse> withCounts(List<Project> projects) {
        List<Long> projectIds = projects.stream().map(Project::getId).toList();
        LocalDateTime now = LocalDateTime.now();
        Map<Long, List<Recruitment>> byProject = recruitmentRepository.findByProjectIdInOrderByCreatedAtDescIdDesc(projectIds).stream()
                .filter(item -> item.getStatus() != RecruitmentStatus.CANCELLED)
                .collect(Collectors.groupingBy(item -> item.getProject().getId()));

        return projects.stream().map(project -> {
            List<Recruitment> recruitments = byProject.getOrDefault(project.getId(), List.of());
            long open = recruitments.stream().filter(item -> statusOf(item, now).equals("recruiting")).count();
            return ProjectResponse.of(project, recruitments.size(), open);
        }).toList();
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

    // 모집글 이미지는 보낸 순서대로 0부터 sortOrder를 매긴다. 상세에서 프로젝트 대표 이미지 다음에 이 순서로 놓인다
    private void saveRecruitmentImages(Recruitment recruitment, List<String> imageUrls) {
        if (imageUrls == null) return;
        for (int index = 0; index < imageUrls.size(); index++) {
            recruitmentImageRepository.save(RecruitmentImage.builder().recruitment(recruitment).url(imageUrls.get(index).trim()).sortOrder(index).build());
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

    // 한국 날짜의 끝 시각을 서버 시간대의 시각으로 바꾼다. 서버가 UTC면 23:59:59가 14:59:59로 저장된다
    private LocalDateTime endOf(LocalDate date) {
        return date.atTime(END_OF_DAY).atZone(SEOUL).withZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
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
