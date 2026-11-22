package com.testmoa.backend.service;

import com.testmoa.backend.dto.request.VersionLinksUpdateRequest.Link;
import com.testmoa.backend.entity.ClusterGroup;
import com.testmoa.backend.entity.GroupLink;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.VersionComparison;
import com.testmoa.backend.global.client.AnalysisClient.ComparisonResponse;
import com.testmoa.backend.global.client.AnalysisClient.GroupMatch;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.ClusterGroupRepository;
import com.testmoa.backend.repository.GroupLinkRepository;
import com.testmoa.backend.repository.ProjectRepository;
import com.testmoa.backend.repository.RecruitmentRepository;
import com.testmoa.backend.repository.VersionComparisonRepository;
import com.testmoa.backend.service.VersionComparisonReader.ComparisonTarget;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 버전 비교의 짝(group_links)을 한 트랜잭션에서 저장함. 짝은 N:M이고, 개발자가 고친 그룹(links_edited_at)의 짝은
 * 다시 비교해도 바꾸지 않음. 분석 서버 응답은 그대로 믿지 않고 두 버전의 그룹인지 다시 확인해 아니면 버림
 */
@Component
@RequiredArgsConstructor
public class VersionComparisonWriter {
    private final ProjectRepository projectRepository;
    private final RecruitmentRepository recruitmentRepository;
    private final ClusterGroupRepository clusterGroupRepository;
    private final GroupLinkRepository groupLinkRepository;
    private final VersionComparisonRepository versionComparisonRepository;

    /**
     * 개발자가 고치지 않은 이번 버전 그룹의 짝을 지우고 응답의 짝으로 다시 만듦. 같은 짝은 한 번만 저장함.
     * 요약은 모집글당 한 행에 덮어씀. notReportedGroupIds는 저장하지 않고 조회할 때 짝으로 계산함
     */
    @Transactional
    public void save(ComparisonTarget target, ComparisonResponse response) {
        lockProject(target.projectId());
        Recruitment current = recruitmentRepository.findById(target.currentRecruitmentId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        Recruitment previous = recruitmentRepository.findById(target.previousRecruitmentId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        Map<Long, ClusterGroup> currentGroups = byId(clusterGroupRepository.findByRecruitmentIdOrderByIdAsc(current.getId()));
        Map<Long, ClusterGroup> previousGroups = byId(clusterGroupRepository.findByRecruitmentIdOrderByIdAsc(previous.getId()));

        // 비교하는 동안 개발자가 짝을 고쳤어도 지금 고친 그룹이면 그대로 둠
        Set<Long> open = currentGroups.values().stream()
                .filter(group -> group.getLinksEditedAt() == null)
                .map(ClusterGroup::getId)
                .collect(Collectors.toSet());
        if (!open.isEmpty()) groupLinkRepository.deleteByCurrentGroupIds(open);

        Set<List<Long>> saved = new HashSet<>();
        for (GroupMatch match : response.matches()) {
            // 고친 그룹, 다른 버전의 그룹이나 없는 ID, 이미 저장한 짝이면 버림
            if (match == null || !open.contains(match.currentGroupId())) continue;
            ClusterGroup previousGroup = previousGroups.get(match.previousGroupId());
            if (previousGroup == null || !saved.add(List.of(match.currentGroupId(), previousGroup.getId()))) continue;
            groupLinkRepository.save(GroupLink.builder()
                    .currentGroup(currentGroups.get(match.currentGroupId()))
                    .previousGroup(previousGroup)
                    .build());
        }

        LocalDateTime now = LocalDateTime.now();
        versionComparisonRepository.findByRecruitmentId(current.getId()).ifPresentOrElse(
                comparison -> comparison.overwrite(previous, response.summary(), now),
                () -> versionComparisonRepository.save(VersionComparison.builder()
                        .recruitment(current)
                        .previousRecruitment(previous)
                        .summary(response.summary())
                        .build()));
    }

    /**
     * 개발자가 고친 짝을 저장함. 보낸 그룹의 짝을 보낸 직전 그룹 목록으로 바꾸고(빈 목록은 짝 없음) 고친 일시를 남김.
     * 같은 직전 그룹을 여러 이번 그룹에 이어도 됨. 보내지 않은 그룹의 짝은 그대로 둠.
     * 사람이 고른 값이라 잘못된 짝은 버리지 않고 거절함. 요약과 비교 시각은 그대로 둠
     */
    @Transactional
    public void relink(Long userId, Long recruitmentId, List<Link> links) {
        Recruitment current = recruitmentRepository.findMineWithProject(recruitmentId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        VersionComparison comparison = versionComparisonRepository.findByRecruitmentId(current.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.COMPARISON_NOT_FOUND));
        Recruitment previous = comparison.getPreviousRecruitment();
        VersionComparisonReader.requireNotAnalyzing(current, previous);

        lockProject(current.getProject().getId());
        Map<Long, ClusterGroup> currentGroups = byId(clusterGroupRepository.findByRecruitmentIdOrderByIdAsc(current.getId()));
        Map<Long, ClusterGroup> previousGroups = byId(clusterGroupRepository.findByRecruitmentIdOrderByIdAsc(previous.getId()));

        // 이번 버전 그룹 → 이을 직전 그룹. 하나라도 잘못되면 아무것도 바꾸지 않음
        Map<ClusterGroup, List<ClusterGroup>> edits = new LinkedHashMap<>();
        for (Link link : links) {
            ClusterGroup group = currentGroups.get(link.groupId());
            if (group == null || edits.containsKey(group)) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "이번 버전 그룹을 한 번씩만 골라 주세요");
            }
            List<ClusterGroup> linked = new ArrayList<>();
            for (Long previousGroupId : link.previousGroupIds()) {
                ClusterGroup previousGroup = previousGroups.get(previousGroupId);
                if (previousGroup == null || linked.contains(previousGroup)) {
                    throw new BusinessException(ErrorCode.INVALID_INPUT, "직전 버전 그룹을 한 그룹에 한 번씩만 골라 주세요");
                }
                linked.add(previousGroup);
            }
            edits.put(group, linked);
        }

        groupLinkRepository.deleteByCurrentGroupIds(edits.keySet().stream().map(ClusterGroup::getId).toList());
        LocalDateTime now = LocalDateTime.now();
        edits.forEach((group, linked) -> {
            group.markLinksEdited(now);
            linked.forEach(previousGroup -> groupLinkRepository.save(
                    GroupLink.builder().currentGroup(group).previousGroup(previousGroup).build()));
        });
    }

    // 같은 프로젝트의 비교 저장·짝 저장·분석 저장이 차례로 실행되도록 트랜잭션이 끝날 때까지 프로젝트 행을 잠금
    private void lockProject(Long projectId) {
        projectRepository.findByIdForUpdate(projectId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private static Map<Long, ClusterGroup> byId(List<ClusterGroup> groups) {
        return groups.stream().collect(Collectors.toMap(ClusterGroup::getId, Function.identity()));
    }
}
