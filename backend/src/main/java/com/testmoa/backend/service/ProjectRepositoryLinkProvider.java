package com.testmoa.backend.service;

import java.util.Optional;

/**
 * 프로젝트에 연결된 GitHub 레포와 이슈를 만들 토큰을 찾는다. 연결 방식(GitHub App 설치 등)은 구현체가 정한다.
 */
public interface ProjectRepositoryLinkProvider {
    // 레포가 연결되지 않았으면 비어 있음
    Optional<RepositoryLink> find(Long projectId);

    record RepositoryLink(String owner, String repo, String token) {
        // 로그에 토큰이 찍히지 않게 함
        @Override
        public String toString() {
            return "RepositoryLink[" + owner + "/" + repo + "]";
        }
    }
}
