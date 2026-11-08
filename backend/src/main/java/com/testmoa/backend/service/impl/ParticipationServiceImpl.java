package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.request.FeedbackSubmitRequest;
import com.testmoa.backend.dto.response.ParticipationListItemResponse;
import com.testmoa.backend.dto.response.ParticipationSummaryResponse;
import com.testmoa.backend.dto.response.ParticipationResponse;
import com.testmoa.backend.dto.response.ParticipationResponse.FeedbackInfo;
import com.testmoa.backend.dto.response.ParticipationResponse.RecruitmentInfo;
import com.testmoa.backend.dto.response.ParticipationResponse.TestItemInfo;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.TestItem;
import com.testmoa.backend.entity.enums.RegisterStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.FeedbackRepository;
import com.testmoa.backend.repository.RecruitmentTypeRepository;
import com.testmoa.backend.repository.RegisterRepository;
import com.testmoa.backend.repository.TestItemRepository;
import com.testmoa.backend.service.ParticipationService;
import com.testmoa.backend.service.ParticipationStatuses;
import com.testmoa.backend.service.RecruitmentNames;
import com.testmoa.backend.service.RewardPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ParticipationServiceImpl implements ParticipationService {

    // 제출 뒤 이 시간 동안 신고가 없으면 자동 지급한다(README)
    private static final Duration PAYOUT_WAIT = Duration.ofHours(72);
    private static final String EMPTY_MESSAGE = "피드백을 적어 주세요";

    private final RegisterRepository registerRepository;
    private final FeedbackRepository feedbackRepository;
    private final TestItemRepository testItemRepository;
    private final RecruitmentTypeRepository recruitmentTypeRepository;

    @Override
    public ParticipationResponse find(Long userId, Long registerId) {
        Register register = registerRepository.findMine(registerId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return toResponse(register, testItemRepository.findByRecruitmentIdOrderBySortOrderAscIdAsc(register.getRecruitment().getId()),
                feedbackRepository.findByRegisterId(registerId), LocalDateTime.now());
    }

    @Override
    @Transactional
    public ParticipationResponse submitFeedback(Long userId, Long registerId, FeedbackSubmitRequest request) {
        /* 참가 행을 잠가 두 번 눌러도 두 번째는 첫 제출을 본다 */
        Register register = registerRepository.findMineForUpdate(registerId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        LocalDateTime now = LocalDateTime.now();
        if (register.getStatus() != RegisterStatus.CONFIRMED) throw new BusinessException(ErrorCode.PARTICIPATION_NOT_CONFIRMED);
        if (!now.isBefore(register.getRecruitment().getFeedbackDeadline())) throw new BusinessException(ErrorCode.FEEDBACK_DEADLINE_PASSED);
        if (feedbackRepository.existsByRegisterId(registerId)) throw new BusinessException(ErrorCode.FEEDBACK_ALREADY_SUBMITTED);

        List<TestItem> testItems = testItemRepository.findByRecruitmentIdOrderBySortOrderAscIdAsc(register.getRecruitment().getId());
        Map<Long, String> contents = contentsOf(request, testItems);
        String etc = trimToNull(request.etc());

        /* 필수 항목이 비었으면 칸마다, 아무것도 적지 않았으면 첫 칸에 알린다. 모집에는 항목이 늘 1개 이상 있다 */
        Map<String, String> errors = new LinkedHashMap<>();
        for (TestItem item : testItems) {
            if (item.isRequired() && contents.get(item.getId()) == null) errors.put(fieldOf(item.getId()), EMPTY_MESSAGE);
        }
        if (errors.isEmpty() && contents.values().stream().allMatch(Objects::isNull) && etc == null) {
            errors.put(fieldOf(testItems.get(0).getId()), EMPTY_MESSAGE);
        }
        if (!errors.isEmpty()) throw new BusinessException(ErrorCode.INVALID_INPUT, ErrorCode.INVALID_INPUT.getMessage(), errors);

        /* 모든 행에 같은 제출 시각을 넣는다(#89-S18). 비운 선택 항목은 저장하지 않는다 */
        List<Feedback> saved = new ArrayList<>();
        for (TestItem item : testItems) {
            String content = contents.get(item.getId());
            if (content != null) saved.add(Feedback.builder().register(register).testItem(item).content(content).submittedAt(now).build());
        }
        if (etc != null) saved.add(Feedback.builder().register(register).content(etc).submittedAt(now).build());
        feedbackRepository.saveAll(saved);
        return toResponse(register, testItems, saved, now);
    }

    // 항목 id → 공백을 지운 내용(비었으면 null). 이 모집의 항목이 아니거나 같은 항목을 두 번 보내면 400
    private Map<Long, String> contentsOf(FeedbackSubmitRequest request, List<TestItem> testItems) {
        Map<Long, String> contents = new HashMap<>();
        testItems.forEach(item -> contents.put(item.getId(), null));
        Map<Long, Boolean> seen = new HashMap<>();
        for (FeedbackSubmitRequest.Item item : request.items() == null ? List.<FeedbackSubmitRequest.Item>of() : request.items()) {
            if (!contents.containsKey(item.testItemId()) || seen.put(item.testItemId(), true) != null) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, ErrorCode.INVALID_INPUT.getMessage(),
                        Map.of(fieldOf(item.testItemId()), "테스트 항목을 확인해 주세요"));
            }
            contents.put(item.testItemId(), trimToNull(item.content()));
        }
        return contents;
    }

    private ParticipationResponse toResponse(Register register, List<TestItem> testItems, List<Feedback> feedbacks, LocalDateTime now) {
        Recruitment recruitment = register.getRecruitment();
        String softwareType = recruitmentTypeRepository.findFirstByRecruitmentId(recruitment.getId())
                .map(item -> RecruitmentNames.softwareType(item.getType().getCode())).orElse(null);
        ParticipationListItemResponse item = toItem(register, feedbacks, softwareType, now);
        boolean confirmed = register.getStatus() == RegisterStatus.CONFIRMED;

        return new ParticipationResponse(
                item.id(), item.status(), item.appliedAt(), item.confirmedAt(), item.submittedAt(), item.payoutAt(),
                item.earnedCredits(), item.reward(), item.recruitment(),
                confirmed ? recruitment.getAccessUrl() : null,
                testItems.stream().map(testItem -> new TestItemInfo(testItem.getId(), testItem.getTitle(), testItem.getDescription(),
                        testItem.isRequired())).toList(),
                feedbacks.stream().map(feedback -> new FeedbackInfo(
                        feedback.getTestItem() == null ? null : feedback.getTestItem().getId(), feedback.getContent())).toList());
    }

    // 상세와 목록이 함께 쓰는 참가 한 건의 값
    private ParticipationListItemResponse toItem(Register register, List<Feedback> feedbacks, String softwareType, LocalDateTime now) {
        Recruitment recruitment = register.getRecruitment();
        Project project = recruitment.getProject();
        String status = ParticipationStatuses.of(register, feedbacks, now);
        int reward = register.getStatus() == RegisterStatus.CONFIRMED
                ? register.getBaseRewardSnapshot() + register.getExtraRewardSnapshot()
                : RewardPolicy.BASE_REWARD + RewardPolicy.EXTRA_REWARD;
        LocalDateTime submittedAt = feedbacks.stream().map(Feedback::getSubmittedAt).min(Comparator.naturalOrder()).orElse(null);
        return new ParticipationListItemResponse(
                register.getId(),
                status,
                register.getAppliedAt(),
                register.getConfirmedAt(),
                submittedAt,
                status.equals("payoutPending") ? submittedAt.plus(PAYOUT_WAIT) : null,
                status.equals("paid") ? reward : 0,
                reward,
                new RecruitmentInfo(recruitment.getId(), recruitment.getTitle(), recruitment.getDescription(), project.getTitle(),
                        project.getImageUrl(), RecruitmentNames.phase(recruitment.phaseAt(now)),
                        RecruitmentNames.selectionMode(recruitment.getSelectionMode()), softwareType, recruitment.isSubscription(),
                        recruitment.getRecruitDeadline(), recruitment.getFeedbackDeadline()));
    }

    @Override
    public List<ParticipationListItemResponse> list(Long userId, String tab) {
        List<String> order = ParticipationStatuses.TAB_STATUSES.get(tab);
        if (order == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, ErrorCode.INVALID_INPUT.getMessage(), Map.of("tab", "탭을 확인해 주세요"));
        }
        Comparator<Row> byDate = Comparator.comparing(Row::keyDate).thenComparing(row -> row.item().id());
        Comparator<Row> sort = tab.equals("history")
                ? byDate.reversed()
                : Comparator.<Row>comparingInt(row -> order.indexOf(row.item().status())).thenComparing(byDate);
        return rows(userId).stream().filter(row -> order.contains(row.item().status())).sorted(sort).map(Row::item).toList();
    }

    @Override
    public ParticipationSummaryResponse summary(Long userId) {
        List<ParticipationListItemResponse> items = rows(userId).stream().map(Row::item).toList();
        Map<String, Long> counts = items.stream()
                .collect(Collectors.groupingBy(item -> ParticipationStatuses.tabOf(item.status()), Collectors.counting()));
        return new ParticipationSummaryResponse(
                new ParticipationSummaryResponse.Counts(
                        counts.getOrDefault("applied", 0L).intValue(),
                        counts.getOrDefault("ongoing", 0L).intValue(),
                        counts.getOrDefault("history", 0L).intValue()),
                (int) items.stream().filter(item -> item.status().equals("beforeSubmit")).count(),
                items.stream().filter(item -> item.status().equals("payoutPending")).mapToInt(ParticipationListItemResponse::reward).sum());
    }

    @Override
    public List<ParticipationListItemResponse> deadlines(Long userId) {
        return rows(userId).stream().map(Row::item)
                .filter(item -> item.status().equals("beforeSubmit"))
                .sorted(Comparator.comparing((ParticipationListItemResponse item) -> item.recruitment().submitDeadline())
                        .thenComparing(ParticipationListItemResponse::id))
                .toList();
    }

    /** 목록의 한 행과 정렬에 쓰는 날짜 */
    private record Row(ParticipationListItemResponse item, LocalDateTime keyDate) {}

    // 내 참가 전체. 피드백과 소프트웨어 유형은 참가 수와 상관없이 한 번씩 읽는다
    private List<Row> rows(Long userId) {
        List<Register> registers = registerRepository.findAllMine(userId);
        if (registers.isEmpty()) return List.of();
        LocalDateTime now = LocalDateTime.now();
        Map<Long, List<Feedback>> feedbacks = feedbackRepository.findByRegisterIdIn(registers.stream().map(Register::getId).toList())
                .stream().collect(Collectors.groupingBy(feedback -> feedback.getRegister().getId()));
        Map<Long, String> softwareTypes = recruitmentTypeRepository
                .findByRecruitmentIdIn(registers.stream().map(register -> register.getRecruitment().getId()).distinct().toList())
                .stream().collect(Collectors.toMap(type -> type.getRecruitment().getId(),
                        type -> RecruitmentNames.softwareType(type.getType().getCode()), (first, second) -> first));
        return registers.stream().map(register -> {
            ParticipationListItemResponse item = toItem(register, feedbacks.getOrDefault(register.getId(), List.of()),
                    softwareTypes.get(register.getRecruitment().getId()), now);
            return new Row(item, keyDateOf(item, register));
        }).toList();
    }

    // 상태마다 행에 보이는 날짜(프론트 keyDateOf). 지급일·검토 완료일은 저장하지 않아 자동 지급 시각과 제출 시각을 쓴다
    private static LocalDateTime keyDateOf(ParticipationListItemResponse item, Register register) {
        return switch (item.status()) {
            case "selectionPending", "notSelected" -> item.recruitment().recruitDeadline();
            case "beforeSubmit", "incomplete" -> item.recruitment().submitDeadline();
            case "payoutPending" -> item.payoutAt();
            case "paid" -> item.submittedAt().plus(PAYOUT_WAIT);
            case "underReview", "excluded" -> item.submittedAt();
            default -> Objects.requireNonNullElse(register.getRecruitment().getCancelledAt(), item.appliedAt());
        };
    }

    // 칸별 오류의 이름. 프론트가 항목 id로 칸을 찾는다
    private static String fieldOf(Long testItemId) {
        return "testItems." + testItemId;
    }

    private static String trimToNull(String text) {
        if (text == null) return null;
        String trimmed = text.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
