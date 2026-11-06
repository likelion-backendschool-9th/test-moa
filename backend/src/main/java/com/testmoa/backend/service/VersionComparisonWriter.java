package com.testmoa.backend.service;

import com.testmoa.backend.entity.ClusterGroup;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.VersionComparison;
import com.testmoa.backend.global.client.AnalysisClient.ComparisonResponse;
import com.testmoa.backend.global.client.AnalysisClient.GroupMatch;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.ClusterGroupRepository;
import com.testmoa.backend.repository.ProjectRepository;
import com.testmoa.backend.repository.RecruitmentRepository;
import com.testmoa.backend.repository.VersionComparisonRepository;
import com.testmoa.backend.service.VersionComparisonReader.ComparisonTarget;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 분석 서버의 비교 결과를 한 트랜잭션에서 저장함.
 * 응답을 그대로 믿지 않고, 짝의 현재 그룹이 현재 버전 그룹인지·이전 그룹이 직전 버전 그룹인지 다시 확인해 아니면 버림
 */
@Component
@RequiredArgsConstructor
public class VersionComparisonWriter {
    private final ProjectRepository projectRepository;
    private final RecruitmentRepository recruitmentRepository;
    private final ClusterGroupRepository clusterGroupRepository;
    private final VersionComparisonRepository versionComparisonRepository;

    /**
     * 짝지은 현재 그룹은 이전 그룹의 코드를 이어받고, 새 그룹은 새 코드를 받음. 요약은 모집글당 한 행에 덮어씀.
     * 한 그룹은 한 번만 짝짓고(앞의 짝을 씀), 이미 짝지은 그룹은 새 그룹이어도 건너뜀. notReportedGroupIds는 저장하지 않음
     */
    @Transactional
    public void save(ComparisonTarget target, ComparisonResponse response) {
        // 같은 프로젝트의 비교가 동시에 저장되면 같은 새 코드를 낼 수 있어 끝날 때까지 프로젝트 행을 잠금
        projectRepository.findByIdForUpdate(target.projectId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        Recruitment current = recruitmentRepository.findById(target.currentRecruitmentId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        Recruitment previous = recruitmentRepository.findById(target.previousRecruitmentId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        Map<Long, ClusterGroup> currentGroups = byId(clusterGroupRepository.findByRecruitmentIdOrderByIdAsc(current.getId()));
        Map<Long, ClusterGroup> previousGroups = byId(clusterGroupRepository.findByRecruitmentIdOrderByIdAsc(previous.getId()));

        Set<Long> pairedCurrent = new HashSet<>();
        Set<Long> pairedPrevious = new HashSet<>();
        for (GroupMatch match : response.matches()) {
            if (match == null) continue;
            ClusterGroup currentGroup = currentGroups.get(match.currentGroupId());
            ClusterGroup previousGroup = previousGroups.get(match.previousGroupId());
            // 다른 버전의 그룹이거나 없는 ID, 이미 짝지은 그룹이면 버림
            if (currentGroup == null || previousGroup == null) continue;
            if (pairedCurrent.contains(currentGroup.getId()) || pairedPrevious.contains(previousGroup.getId())) continue;
            pairedCurrent.add(currentGroup.getId());
            pairedPrevious.add(previousGroup.getId());
            currentGroup.updateGroupCode(previousGroup.getGroupCode());
        }

        long nextCode = nextGroupCode(target.projectId());
        for (Long groupId : response.newGroupIds()) {
            ClusterGroup currentGroup = currentGroups.get(groupId);
            if (currentGroup == null || !pairedCurrent.add(currentGroup.getId())) continue;
            currentGroup.updateGroupCode(String.valueOf(nextCode++));
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

    // 그룹 코드는 프로젝트 안에서 1부터 세는 숫자 문자열. 문자열 컬럼이라 DB의 max로는 "9"가 "10"보다 커서 숫자로 읽어 셈
    private long nextGroupCode(Long projectId) {
        return clusterGroupRepository.findGroupCodesByProjectId(projectId).stream()
                .mapToLong(VersionComparisonWriter::parseCode)
                .max()
                .orElse(0) + 1;
    }

    // 숫자로 읽히지 않는 코드는 최대값 계산에서 뺌
    private static long parseCode(String code) {
        try {
            return Long.parseLong(code.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static Map<Long, ClusterGroup> byId(List<ClusterGroup> groups) {
        return groups.stream().collect(Collectors.toMap(ClusterGroup::getId, Function.identity()));
    }
}
