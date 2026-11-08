package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.request.RecruitmentSearchRequest;
import com.testmoa.backend.dto.response.RecruitmentPageResponse;
import com.testmoa.backend.dto.response.RecruitmentResponse;
import com.testmoa.backend.dto.response.RecruitmentResponse.ProjectInfo;
import com.testmoa.backend.dto.response.RecruitmentResponse.TestItemInfo;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.RecruitmentImage;
import com.testmoa.backend.entity.TestItem;
import com.testmoa.backend.entity.TestItemImage;
import com.testmoa.backend.repository.RecruitmentImageRepository;
import com.testmoa.backend.repository.RecruitmentRepository;
import com.testmoa.backend.repository.RecruitmentSearchRepository.Condition;
import com.testmoa.backend.repository.RecruitmentTypeRepository;
import com.testmoa.backend.repository.RegisterRepository;
import com.testmoa.backend.repository.TestItemImageRepository;
import com.testmoa.backend.repository.TestItemRepository;
import com.testmoa.backend.entity.enums.RecruitmentStatus;
import com.testmoa.backend.entity.enums.TypeCode;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.RecruitmentService;
import com.testmoa.backend.service.RecruitmentNames;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecruitmentServiceImpl implements RecruitmentService {

    private final RecruitmentRepository recruitmentRepository;
    private final RecruitmentImageRepository recruitmentImageRepository;
    private final RecruitmentTypeRepository recruitmentTypeRepository;
    private final TestItemRepository testItemRepository;
    private final TestItemImageRepository testItemImageRepository;
    private final RegisterRepository registerRepository;

    /**
     * 공개 모집글 상세. 마감된 모집도 보여 주고, 취소된 모집은 없는 것처럼 404다
     */
    @Override
    public RecruitmentResponse find(Long recruitmentId, Long userId) {
        Recruitment recruitment = recruitmentRepository.findWithProjectById(recruitmentId)
                .filter(item -> item.getStatus() != RecruitmentStatus.CANCELLED)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        Project project = recruitment.getProject();

        List<String> imageUrls = recruitmentImageRepository.findByRecruitmentIdOrderBySortOrderAsc(recruitmentId).stream()
                .map(RecruitmentImage::getUrl).toList();
        String softwareType = recruitmentTypeRepository.findByRecruitmentIdIn(List.of(recruitmentId)).stream()
                .findFirst().map(item -> RecruitmentNames.softwareType(item.getType().getCode())).orElse(null);
        String myRegisterStatus = userId == null ? null : registerRepository
                .findFirstByRecruitmentIdAndUserIdOrderByIdDesc(recruitmentId, userId)
                .map(register -> RecruitmentNames.registerStatus(register.getStatus())).orElse(null);

        return new RecruitmentResponse(
                recruitment.getId(),
                recruitment.getTitle(),
                recruitment.getDescription(),
                recruitment.getConditions(),
                RecruitmentNames.phase(recruitment.phaseAt(LocalDateTime.now())),
                RecruitmentNames.selectionMode(recruitment.getSelectionMode()),
                softwareType,
                recruitment.isSubscription(),
                recruitment.getRecruitDeadline(),
                recruitment.getFeedbackDeadline(),
                new ProjectInfo(project.getId(), project.getTitle(), project.getDescription(), project.getImageUrl()),
                imageUrls,
                testItems(recruitmentId),
                myRegisterStatus);
    }

    // 항목은 저장 순서대로, 항목 이미지는 한 번에 읽어 항목별로 나눈다
    private List<TestItemInfo> testItems(Long recruitmentId) {
        List<TestItem> items = testItemRepository.findByRecruitmentIdOrderByIdAsc(recruitmentId);
        Map<Long, List<String>> images = testItemImageRepository
                .findByTestItemIdInOrderBySortOrderAsc(items.stream().map(TestItem::getId).toList()).stream()
                .collect(Collectors.groupingBy(image -> image.getTestItem().getId(),
                        Collectors.mapping(TestItemImage::getUrl, Collectors.toList())));
        return items.stream().map(item -> new TestItemInfo(item.getId(), item.getTitle(), item.getDescription(),
                item.isRequired(), images.getOrDefault(item.getId(), List.of()))).toList();
    }

    @Override
    public RecruitmentPageResponse search(RecruitmentSearchRequest request) {
        String type = request.type();
        int page = request.page();
        int size = request.size();
        String trimmed = request.q() == null ? "" : request.q().trim();
        Condition condition = new Condition(
                trimmed.isEmpty() ? null : trimmed.toLowerCase(Locale.ROOT),
                typeOf(type),
                request.open(),
                request.subscription(),
                byDeadline(request.sort()),
                LocalDateTime.now());

        long total = recruitmentRepository.countPublic(condition);
        int pageCount = (int) Math.max(1, (total + size - 1) / size);
        int shown = Math.min(page, pageCount);
        List<Recruitment> recruitments = recruitmentRepository.findPublic(condition, (shown - 1) * size, size);

        Map<Long, String> types = recruitmentTypeRepository
                .findByRecruitmentIdIn(recruitments.stream().map(Recruitment::getId).toList()).stream()
                .collect(Collectors.toMap(item -> item.getRecruitment().getId(),
                        item -> RecruitmentNames.softwareType(item.getType().getCode()), (first, second) -> first));
        List<RecruitmentPageResponse.Item> items = recruitments.stream().map(recruitment -> {
            Project project = recruitment.getProject();
            return new RecruitmentPageResponse.Item(
                    recruitment.getId(),
                    recruitment.getTitle(),
                    project.getTitle(),
                    project.getDescription(),
                    project.getImageUrl(),
                    types.get(recruitment.getId()),
                    recruitment.isSubscription(),
                    RecruitmentNames.phase(recruitment.phaseAt(condition.now())),
                    recruitment.getCreatedAt(),
                    recruitment.getRecruitDeadline(),
                    recruitment.getFeedbackDeadline());
        }).toList();
        return new RecruitmentPageResponse(items, total, shown, pageCount);
    }

    // 프론트 유형 이름(web 등)을 코드로. 없으면 전체, 모르는 값은 400
    private TypeCode typeOf(String type) {
        if (type == null || type.isBlank()) return null;
        return Arrays.stream(TypeCode.values())
                .filter(code -> RecruitmentNames.softwareType(code).equals(type))
                .findFirst()
                .orElseThrow(() -> invalid("type", "유형을 확인해 주세요"));
    }

    private boolean byDeadline(String sort) {
        if (sort == null || sort.equals("latest")) return false;
        if (sort.equals("deadline")) return true;
        throw invalid("sort", "정렬을 확인해 주세요");
    }

    private BusinessException invalid(String field, String message) {
        return new BusinessException(ErrorCode.INVALID_INPUT, ErrorCode.INVALID_INPUT.getMessage(), Map.of(field, message));
    }
}
