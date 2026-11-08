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
        Progress progress = progressOf(register, feedbacks, now);
        return new ParticipationResponse(
                register.getId(), progress.status(), register.getAppliedAt(), register.getConfirmedAt(), progress.submittedAt(),
                progress.payoutAt(), progress.earnedCredits(), progress.reward(), recruitmentInfo(recruitment, softwareType, now),
                register.getStatus() == RegisterStatus.CONFIRMED ? recruitment.getAccessUrl() : null,
                testItems.stream().map(testItem -> new TestItemInfo(testItem.getId(), testItem.getTitle(), testItem.getDescription(),
                        testItem.isRequired())).toList(),
                feedbacks.stream().map(feedback -> new FeedbackInfo(
                        feedback.getTestItem() == null ? null : feedback.getTestItem().getId(), feedback.getContent())).toList());
    }

    /**
     * 참가 한 건의 진행 상황. 상세·목록·요약이 함께 쓰는 계산이고, 화면에 보낼 모양은 만들지 않는다
     *
     * @param keyDate 상태마다 행에 보이는 날짜이자 목록의 정렬 기준(프론트 keyDateOf)
     */
    private record Progress(Register register, String status, int reward, LocalDateTime submittedAt, LocalDateTime keyDate) {
        LocalDateTime payoutAt() {
            return status.equals("payoutPending") ? submittedAt.plus(PAYOUT_WAIT) : null;
        }

        int earnedCredits() {
            return status.equals("paid") ? reward : 0;
        }
    }

    private static Progress progressOf(Register register, List<Feedback> feedbacks, LocalDateTime now) {
        String status = ParticipationStatuses.of(register, feedbacks, now);
        int reward = register.getStatus() == RegisterStatus.CONFIRMED
                ? register.getBaseRewardSnapshot() + register.getExtraRewardSnapshot()
                : RewardPolicy.BASE_REWARD + RewardPolicy.EXTRA_REWARD;
        LocalDateTime submittedAt = feedbacks.stream().map(Feedback::getSubmittedAt).min(Comparator.naturalOrder()).orElse(null);
        return new Progress(register, status, reward, submittedAt, keyDateOf(register, status, submittedAt));
    }

    // 상태마다 행에 보이는 날짜(프론트 keyDateOf). 지급일·검토 완료일은 저장하지 않아 자동 지급 시각과 제출 시각을 쓴다
    private static LocalDateTime keyDateOf(Register register, String status, LocalDateTime submittedAt) {
        Recruitment recruitment = register.getRecruitment();
        return switch (status) {
            case "selectionPending", "notSelected" -> recruitment.getRecruitDeadline();
            case "beforeSubmit", "incomplete" -> recruitment.getFeedbackDeadline();
            case "payoutPending", "paid" -> submittedAt.plus(PAYOUT_WAIT);
            case "underReview", "excluded" -> submittedAt;
            default -> Objects.requireNonNullElse(recruitment.getCancelledAt(), register.getAppliedAt());
        };
    }

    private static RecruitmentInfo recruitmentInfo(Recruitment recruitment, String softwareType, LocalDateTime now) {
        Project project = recruitment.getProject();
        return new RecruitmentInfo(recruitment.getId(), recruitment.getTitle(), recruitment.getDescription(), project.getTitle(),
                project.getImageUrl(), RecruitmentNames.phase(recruitment.phaseAt(now)),
                RecruitmentNames.selectionMode(recruitment.getSelectionMode()), softwareType, recruitment.isSubscription(),
                recruitment.getRecruitDeadline(), recruitment.getFeedbackDeadline());
    }

    private static ParticipationListItemResponse toItem(Progress progress, String softwareType, LocalDateTime now) {
        Register register = progress.register();
        return new ParticipationListItemResponse(
                register.getId(), progress.status(), progress.keyDate(), register.getAppliedAt(), register.getConfirmedAt(),
                progress.submittedAt(), progress.payoutAt(), progress.earnedCredits(), progress.reward(),
                recruitmentInfo(register.getRecruitment(), softwareType, now));
    }

    @Override
    public List<ParticipationListItemResponse> list(Long userId, String tab) {
        List<String> order = ParticipationStatuses.TAB_STATUSES.get(tab);
        if (order == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, ErrorCode.INVALID_INPUT.getMessage(), Map.of("tab", "탭을 확인해 주세요"));
        }
        Comparator<Progress> byDate = Comparator.comparing(Progress::keyDate).thenComparing(progress -> progress.register().getId());
        Comparator<Progress> sort = tab.equals("history")
                ? byDate.reversed()
                : Comparator.<Progress>comparingInt(progress -> order.indexOf(progress.status())).thenComparing(byDate);
        return toItems(progresses(userId).stream().filter(progress -> order.contains(progress.status())).sorted(sort).toList());
    }

    @Override
    public ParticipationSummaryResponse summary(Long userId) {
        List<Progress> progresses = progresses(userId);
        Map<String, Long> counts = progresses.stream()
                .collect(Collectors.groupingBy(progress -> ParticipationStatuses.tabOf(progress.status()), Collectors.counting()));
        return new ParticipationSummaryResponse(
                new ParticipationSummaryResponse.Counts(
                        counts.getOrDefault("applied", 0L).intValue(),
                        counts.getOrDefault("ongoing", 0L).intValue(),
                        counts.getOrDefault("history", 0L).intValue()),
                (int) progresses.stream().filter(progress -> progress.status().equals("beforeSubmit")).count(),
                progresses.stream().filter(progress -> progress.status().equals("payoutPending")).mapToInt(Progress::reward).sum());
    }

    @Override
    public List<ParticipationListItemResponse> deadlines(Long userId) {
        return toItems(progresses(userId).stream()
                .filter(progress -> progress.status().equals("beforeSubmit"))
                .sorted(Comparator.comparing(Progress::keyDate).thenComparing(progress -> progress.register().getId()))
                .toList());
    }

    // 내 참가 전체의 진행 상황. 참가와 피드백을 한 번씩 읽는다
    private List<Progress> progresses(Long userId) {
        List<Register> registers = registerRepository.findAllMine(userId);
        if (registers.isEmpty()) return List.of();
        LocalDateTime now = LocalDateTime.now();
        Map<Long, List<Feedback>> feedbacks = feedbackRepository.findByRegisterIdIn(registers.stream().map(Register::getId).toList())
                .stream().collect(Collectors.groupingBy(feedback -> feedback.getRegister().getId()));
        return registers.stream()
                .map(register -> progressOf(register, feedbacks.getOrDefault(register.getId(), List.of()), now))
                .toList();
    }

    // 목록 행으로 바꾼다. 소프트웨어 유형은 행 수와 상관없이 한 번 읽는다
    private List<ParticipationListItemResponse> toItems(List<Progress> progresses) {
        if (progresses.isEmpty()) return List.of();
        LocalDateTime now = LocalDateTime.now();
        Map<Long, String> softwareTypes = recruitmentTypeRepository
                .findByRecruitmentIdIn(progresses.stream().map(progress -> progress.register().getRecruitment().getId()).distinct().toList())
                .stream().collect(Collectors.toMap(type -> type.getRecruitment().getId(),
                        type -> RecruitmentNames.softwareType(type.getType().getCode()), (first, second) -> first));
        return progresses.stream()
                .map(progress -> toItem(progress, softwareTypes.get(progress.register().getRecruitment().getId()), now))
                .toList();
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
