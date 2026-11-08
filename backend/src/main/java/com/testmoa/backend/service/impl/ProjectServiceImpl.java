package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.request.ProjectSaveRequest;
import com.testmoa.backend.dto.request.RecruitmentCreateRequest;
import com.testmoa.backend.dto.request.RecruitmentUpdateRequest;
import com.testmoa.backend.dto.request.TestItemsUpdateRequest;
import com.testmoa.backend.dto.response.ProjectResponse;
import com.testmoa.backend.dto.response.RecruitmentCreateResponse;
import com.testmoa.backend.dto.response.RecruitmentSummaryResponse;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.RecruitmentImage;
import com.testmoa.backend.entity.RecruitmentType;
import com.testmoa.backend.entity.TestItem;
import com.testmoa.backend.entity.TestItemImage;
import com.testmoa.backend.entity.Type;
import com.testmoa.backend.repository.FeedbackRepository;
import com.testmoa.backend.repository.ProjectRepository;
import com.testmoa.backend.repository.RecruitmentImageRepository;
import com.testmoa.backend.repository.RecruitmentRepository;
import com.testmoa.backend.repository.RecruitmentTypeRepository;
import com.testmoa.backend.repository.RegisterRepository;
import com.testmoa.backend.repository.TestItemImageRepository;
import com.testmoa.backend.repository.TestItemRepository;
import com.testmoa.backend.repository.TypeRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.entity.enums.RecruitmentPhase;
import com.testmoa.backend.entity.enums.RecruitmentStatus;
import com.testmoa.backend.entity.enums.RegisterStatus;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.TypeCode;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.ProjectService;
import com.testmoa.backend.service.RecruitmentNames;
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
import java.util.Objects;
import java.util.Set;
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
    private final FeedbackRepository feedbackRepository;
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
        Map<Long, Long> confirmed = countMap(registerRepository.countByRecruitmentIds(recruitmentIds, RegisterStatus.CONFIRMED));
        Map<Long, Long> feedbacks = countMap(feedbackRepository.countByRecruitmentIds(recruitmentIds));

        LocalDateTime now = LocalDateTime.now();
        return recruitments.stream().map(item -> RecruitmentSummaryResponse.of(
                item,
                RecruitmentNames.phase(item.phaseAt(now)),
                RecruitmentNames.selectionMode(item.getSelectionMode()),
                RecruitmentNames.softwareType(types.get(item.getId())),
                confirmed.getOrDefault(item.getId(), 0L),
                feedbacks.getOrDefault(item.getId(), 0L))).toList();
    }

    private static Map<Long, Long> countMap(List<RegisterRepository.RecruitmentCount> counts) {
        return counts.stream().collect(Collectors.toMap(RegisterRepository.RecruitmentCount::getRecruitmentId, RegisterRepository.RecruitmentCount::getCount));
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
        boolean subscribed = subscriptionChecker.isActive(userId);
        if (selectionMode == SelectionMode.MANUAL && !subscribed) {
            throw invalid("selectionMode", "선발형은 구독 모집에서만 쓸 수 있어요");
        }

        // 프로젝트 행을 잠가 동시에 만들어도 버전이 겹치지 않게 한다
        projectRepository.findByIdForUpdate(project.getId());
        int version = recruitmentRepository.findMaxVersionByProjectId(project.getId()).map(max -> max + 1).orElse(1);
        Recruitment recruitment = recruitmentRepository.save(Recruitment.builder()
                .project(project)
                .title(request.title().trim())
                .description(request.description().trim())
                .conditions(blankToNull(request.conditions()))
                .accessUrl(request.accessUrl().trim())
                .recruitDeadline(endOf(request.recruitDeadline()))
                .feedbackDeadline(endOf(request.submitDeadline()))
                .selectionMode(selectionMode)
                .subscription(subscribed)
                .version(version)
                .build());
        saveRecruitmentImages(recruitment, request.imageUrls());
        recruitmentTypeRepository.save(RecruitmentType.builder().recruitment(recruitment).type(findOrCreateType(TypeCode.WEB)).build());
        for (int index = 0; index < request.testItems().size(); index++) {
            saveTestItem(recruitment, request.testItems().get(index), index);
        }
        return new RecruitmentCreateResponse(recruitment.getId());
    }

    /**
     * 모집 정보 수정. 보낸 값만 바꾸고 종료·취소한 모집은 409.
     * 지원이 있으면 선정 방식을, 모집 마감이 지나면 모집 마감일을 바꿀 수 없고 마감일은 미루기만 한다
     */
    @Override
    @Transactional
    public void updateRecruitment(Long userId, Long recruitmentId, RecruitmentUpdateRequest request) {
        Recruitment recruitment = findEditable(userId, recruitmentId);

        SelectionMode selectionMode = request.selectionMode() == null ? recruitment.getSelectionMode() : selectionModeOf(request.selectionMode());
        if (selectionMode != recruitment.getSelectionMode()) {
            if (registerRepository.existsByRecruitmentId(recruitmentId)) throw invalid("selectionMode", "지원자가 있어 선정 방식을 바꿀 수 없어요");
            if (selectionMode == SelectionMode.MANUAL && !recruitment.isSubscription()) {
                throw invalid("selectionMode", "선발형은 구독 모집에서만 쓸 수 있어요");
            }
        }

        LocalDateTime recruitDeadline = recruitment.getRecruitDeadline();
        if (request.recruitDeadline() != null && !request.recruitDeadline().equals(seoulDate(recruitDeadline))) {
            if (recruitment.phaseAt(LocalDateTime.now()) != RecruitmentPhase.RECRUITING) throw invalid("recruitDeadline", "모집이 마감돼 바꿀 수 없어요");
            if (request.recruitDeadline().isBefore(seoulDate(recruitDeadline))) throw invalid("recruitDeadline", "모집 마감일은 미루기만 할 수 있어요");
            recruitDeadline = endOf(request.recruitDeadline());
        }
        LocalDateTime feedbackDeadline = recruitment.getFeedbackDeadline();
        if (request.submitDeadline() != null && !request.submitDeadline().equals(seoulDate(feedbackDeadline))) {
            if (request.submitDeadline().isBefore(seoulDate(feedbackDeadline))) throw invalid("submitDeadline", "제출 마감일은 미루기만 할 수 있어요");
            feedbackDeadline = endOf(request.submitDeadline());
        }
        if (!feedbackDeadline.isAfter(recruitDeadline)) throw invalid("submitDeadline", "제출 마감일은 모집 마감일보다 뒤여야 해요");

        recruitment.edit(
                request.title() == null ? recruitment.getTitle() : request.title().trim(),
                request.description() == null ? recruitment.getDescription() : request.description().trim(),
                request.accessUrl() == null ? recruitment.getAccessUrl() : request.accessUrl().trim(),
                request.conditions() == null ? recruitment.getConditions() : blankToNull(request.conditions()),
                selectionMode, recruitDeadline, feedbackDeadline);
        if (request.softwareTypes() != null) replaceTypes(recruitment, request.softwareTypes());
    }

    /**
     * 테스트 항목을 보낸 순서대로 맞춘다. 빠진 항목은 이미지와 함께 지우고, id가 없는 항목은 새로 만든다.
     * 다른 모집글의 항목 id는 400, 피드백이 달린 항목을 빼면 400
     */
    @Override
    @Transactional
    public void updateTestItems(Long userId, Long recruitmentId, TestItemsUpdateRequest request) {
        Recruitment recruitment = findEditable(userId, recruitmentId);
        Map<Long, TestItem> current = testItemRepository.findByRecruitmentIdOrderBySortOrderAscIdAsc(recruitmentId).stream()
                .collect(Collectors.toMap(TestItem::getId, item -> item));
        List<Long> keptIds = request.testItems().stream().map(TestItemsUpdateRequest.Item::id).filter(Objects::nonNull).toList();
        if (!current.keySet().containsAll(keptIds) || keptIds.size() != keptIds.stream().distinct().count()) {
            throw invalid("testItems", "테스트 항목을 확인해 주세요");
        }
        List<Long> removedIds = current.keySet().stream().filter(id -> !keptIds.contains(id)).toList();
        if (feedbackRepository.findTestItemIdsWithFeedback(recruitmentId).stream().anyMatch(removedIds::contains)) {
            throw invalid("testItems", "피드백이 달린 항목은 지울 수 없어요");
        }
        testItemImageRepository.deleteByTestItemIdIn(removedIds);
        testItemRepository.deleteAllById(removedIds);

        for (int index = 0; index < request.testItems().size(); index++) {
            TestItemsUpdateRequest.Item item = request.testItems().get(index);
            String description = blankToNull(item.description());
            if (item.id() == null) {
                testItemRepository.save(TestItem.builder().recruitment(recruitment).title(item.title().trim())
                        .description(description).required(item.required()).sortOrder(index).build());
            } else {
                current.get(item.id()).edit(item.title().trim(), description, item.required(), index);
            }
        }
    }

    // 내 모집글을 잠가 읽는다. 종료·취소한 모집은 바꿀 수 없다
    private Recruitment findEditable(Long userId, Long recruitmentId) {
        Recruitment recruitment = recruitmentRepository.findMineForUpdate(recruitmentId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        RecruitmentPhase phase = recruitment.phaseAt(LocalDateTime.now());
        if (phase == RecruitmentPhase.CLOSED || phase == RecruitmentPhase.CANCELLED) {
            throw new BusinessException(ErrorCode.RECRUITMENT_NOT_EDITABLE);
        }
        return recruitment;
    }

    // 고른 유형만 남긴다. 그대로인 유형은 두고 빠진 것은 지우고 새로 고른 것은 더한다
    private void replaceTypes(Recruitment recruitment, List<String> softwareTypes) {
        Set<TypeCode> chosen = softwareTypes.stream().map(value -> TypeCode.valueOf(value.toUpperCase())).collect(Collectors.toSet());
        List<RecruitmentType> current = recruitmentTypeRepository.findByRecruitmentIdIn(List.of(recruitment.getId()));
        recruitmentTypeRepository.deleteAll(current.stream().filter(item -> !chosen.contains(item.getType().getCode())).toList());
        Set<TypeCode> kept = current.stream().map(item -> item.getType().getCode()).collect(Collectors.toSet());
        chosen.stream().filter(code -> !kept.contains(code)).forEach(code ->
                recruitmentTypeRepository.save(RecruitmentType.builder().recruitment(recruitment).type(findOrCreateType(code)).build()));
    }

    // 서버 시간대의 시각을 한국 날짜로 바꾼다. endOf의 반대
    private LocalDate seoulDate(LocalDateTime dateTime) {
        return dateTime.atZone(ZoneId.systemDefault()).withZoneSameInstant(SEOUL).toLocalDate();
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
            long open = recruitments.stream().filter(item -> item.phaseAt(now) == RecruitmentPhase.RECRUITING).count();
            return ProjectResponse.of(project, recruitments.size(), open);
        }).toList();
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

    private void saveTestItem(Recruitment recruitment, RecruitmentCreateRequest.TestItemRequest item, int sortOrder) {
        TestItem testItem = testItemRepository.save(TestItem.builder()
                .recruitment(recruitment)
                .title(item.title().trim())
                .description(blankToNull(item.description()))
                .required(item.required())
                .sortOrder(sortOrder)
                .build());
        List<String> imageUrls = item.imageUrls() == null ? List.of() : item.imageUrls();
        for (int index = 0; index < imageUrls.size(); index++) {
            testItemImageRepository.save(TestItemImage.builder().testItem(testItem).url(imageUrls.get(index)).sortOrder(index).build());
        }
    }

    // 유형은 처음 쓸 때 만든다. 앱 시작 때 만들면 테이블이 없는 환경에서 앱이 뜨지 못한다.
    // 처음 쓰는 요청 둘이 겹쳐도 유일 제약 오류로 모집 작성이 실패하지 않게, 없을 때만 넣는 SQL로 만든 뒤 다시 읽는다
    private Type findOrCreateType(TypeCode code) {
        return typeRepository.findByCode(code).orElseGet(() -> {
            typeRepository.insertIfAbsent(code.name(), LocalDateTime.now());
            return typeRepository.findByCode(code).orElseThrow();
        });
    }

    // 한국 날짜의 끝 시각을 서버 시간대의 시각으로 바꾼다. 서버가 UTC면 23:59:59가 14:59:59로 저장된다
    private LocalDateTime endOf(LocalDate date) {
        return date.atTime(END_OF_DAY).atZone(SEOUL).withZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
    }

    private SelectionMode selectionModeOf(String value) {
        return "selection".equals(value) ? SelectionMode.MANUAL : SelectionMode.FIRST_COME;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private BusinessException invalid(String field, String message) {
        return new BusinessException(ErrorCode.INVALID_INPUT, ErrorCode.INVALID_INPUT.getMessage(), Map.of(field, message));
    }
}
