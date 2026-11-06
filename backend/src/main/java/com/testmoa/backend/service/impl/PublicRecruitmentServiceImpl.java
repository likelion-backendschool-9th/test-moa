package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.response.PublicRecruitmentResponse;
import com.testmoa.backend.dto.response.PublicRecruitmentResponse.ProjectInfo;
import com.testmoa.backend.dto.response.PublicRecruitmentResponse.TestItemInfo;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.RecruitmentImage;
import com.testmoa.backend.entity.TestItem;
import com.testmoa.backend.entity.TestItemImage;
import com.testmoa.backend.repository.RecruitmentImageRepository;
import com.testmoa.backend.repository.RecruitmentRepository;
import com.testmoa.backend.repository.RecruitmentTypeRepository;
import com.testmoa.backend.repository.RegisterRepository;
import com.testmoa.backend.repository.TestItemImageRepository;
import com.testmoa.backend.repository.TestItemRepository;
import com.testmoa.backend.entity.enums.RecruitmentStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.PublicRecruitmentService;
import com.testmoa.backend.service.RecruitmentNames;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicRecruitmentServiceImpl implements PublicRecruitmentService {

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
    public PublicRecruitmentResponse find(Long recruitmentId, Long userId) {
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

        return new PublicRecruitmentResponse(
                recruitment.getId(),
                recruitment.getTitle(),
                recruitment.getDescription(),
                recruitment.getConditions(),
                RecruitmentNames.status(recruitment, LocalDateTime.now()),
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
}
