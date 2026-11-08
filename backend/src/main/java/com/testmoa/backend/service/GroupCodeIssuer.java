package com.testmoa.backend.service;

import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.ClusterGroupRepository;
import com.testmoa.backend.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 분석 그룹 코드 발급. 코드는 프로젝트 안에서 1부터 세는 숫자 문자열이고 백엔드만 발급함.
 * 리뷰 묶기(#107)와 버전 비교(#108)가 함께 씀
 */
@Component
@RequiredArgsConstructor
public class GroupCodeIssuer {
    private final ProjectRepository projectRepository;
    private final ClusterGroupRepository clusterGroupRepository;

    /**
     * 트랜잭션이 끝날 때까지 프로젝트 행을 잠그고, 지금 최대 코드 다음부터 하나씩 내주는 발급기를 돌려줌.
     * 같은 프로젝트의 다른 저장은 잠금이 풀릴 때까지 기다려 같은 코드를 내지 못함. 저장 트랜잭션 안에서만 부름
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Codes open(Long projectId) {
        projectRepository.findByIdForUpdate(projectId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        // 문자열 컬럼이라 DB의 max로는 "9"가 "10"보다 커서 숫자로 읽어 셈
        long max = clusterGroupRepository.findGroupCodesByProjectId(projectId).stream()
                .mapToLong(GroupCodeIssuer::parse)
                .max()
                .orElse(0);
        return new Codes(max + 1);
    }

    // 숫자로 읽히지 않는 코드는 최대값 계산에서 뺌
    private static long parse(String code) {
        try {
            return Long.parseLong(code.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /**
     * 연 시점의 최대 코드 다음부터 차례로 내줌
     */
    public static final class Codes {
        private long next;

        private Codes(long first) {
            this.next = first;
        }

        public String next() {
            return String.valueOf(next++);
        }
    }
}
