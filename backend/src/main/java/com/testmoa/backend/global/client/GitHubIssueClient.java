package com.testmoa.backend.global.client;

import com.testmoa.backend.service.ProjectRepositoryLinkProvider.RepositoryLink;

import java.util.List;

/**
 * GitHub 레포에 이슈를 만든다. 실패하면 BusinessException(GITHUB_*)을 던진다.
 */
public interface GitHubIssueClient {
    IssueRef create(RepositoryLink repository, String title, String body, List<String> labels);

    /** 레포 연결 때 토큰으로 레포를 읽고 이슈를 만들 수 있는지 확인한다. 안 되면 BusinessException(GITHUB_*) */
    void verify(RepositoryLink repository);

    record IssueRef(String url, int number) {}
}
