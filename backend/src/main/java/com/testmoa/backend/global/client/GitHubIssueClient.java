package com.testmoa.backend.global.client;

import com.testmoa.backend.service.ProjectRepositoryLinkProvider.RepositoryLink;

import java.util.List;

/**
 * GitHub 레포에 이슈를 만든다. 실패하면 BusinessException(GITHUB_*)을 던진다.
 */
public interface GitHubIssueClient {
    IssueRef create(RepositoryLink repository, String title, String body, List<String> labels);

    record IssueRef(String url, int number) {}
}
