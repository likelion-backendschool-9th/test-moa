package com.testmoa.backend.service;

import com.testmoa.backend.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 개발자가 프로젝트에 연결한 GitHub 레포와 토큰(#227). 레포나 토큰이 하나라도 없으면 연결 안 됨이다.
 * 분석 서비스가 GitHub를 트랜잭션 밖에서 부르기 전에 읽으므로 이 읽기만 짧게 한다
 */
@Component
@RequiredArgsConstructor
public class ProjectRepositoryLinks implements ProjectRepositoryLinkProvider {
    private final ProjectRepository projectRepository;

    @Override
    public Optional<RepositoryLink> find(Long projectId) {
        return projectRepository.findById(projectId)
                .filter(project -> project.getGithubRepository() != null && project.getGithubToken() != null)
                .map(project -> {
                    var name = GitHubRepositoryNames.of(project.getGithubRepository());
                    return new RepositoryLink(name.owner(), name.repo(), project.getGithubToken());
                });
    }
}
