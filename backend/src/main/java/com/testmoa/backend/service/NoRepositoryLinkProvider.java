package com.testmoa.backend.service;

import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * shortcut: 레포 연결(GitHub App 설치) 기능이 아직 없어 늘 "연결 안 됨"이다. 그 기능을 만들 때 이 클래스를 진짜 구현체로 바꾼다.
 */
@Component
public class NoRepositoryLinkProvider implements ProjectRepositoryLinkProvider {
    @Override
    public Optional<RepositoryLink> find(Long projectId) {
        return Optional.empty();
    }
}
