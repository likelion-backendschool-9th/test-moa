package com.testmoa.backend.global.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.ProjectRepositoryLinkProvider.RepositoryLink;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;

/**
 * GitHub REST API(POST /repos/{owner}/{repo}/issues)로 이슈를 만든다.
 * 레포에 없는 라벨은 GitHub이 이슈를 만들 때 함께 만든다(push 권한이 있을 때). 권한이 없으면 오류 없이 라벨만 빠지므로,
 * GitHub App 권한을 정할 때 라벨을 붙이고 만들 수 있는지 함께 확인한다.
 */
@Slf4j
@Component
public class GitHubRestIssueClient implements GitHubIssueClient {
    private final RestClient http;

    public GitHubRestIssueClient() {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.http = RestClient.builder()
                .baseUrl("https://api.github.com")
                .requestFactory(factory)
                .defaultHeader("Accept", "application/vnd.github+json")
                .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
                .build();
    }

    @Override
    public IssueRef create(RepositoryLink repository, String title, String body, List<String> labels) {
        try {
            Created created = http.post()
                    .uri("/repos/{owner}/{repo}/issues", repository.owner(), repository.repo())
                    .header("Authorization", "Bearer " + repository.token())
                    .body(new NewIssue(title, body, labels))
                    .retrieve()
                    .body(Created.class);
            if (created == null || created.htmlUrl() == null) {
                log.error("GitHub 이슈 응답에 주소가 없음 repo={}", repository);
                throw new BusinessException(ErrorCode.INTERNAL_ERROR);
            }
            return new IssueRef(created.htmlUrl(), created.number());
        } catch (RestClientResponseException e) {
            throw translate(e, repository);
        } catch (ResourceAccessException e) {
            log.warn("GitHub에 연결하지 못했거나 응답 대기 시간을 넘김 repo={}", repository, e);
            throw new BusinessException(ErrorCode.GITHUB_UNAVAILABLE);
        } catch (RestClientException e) {
            log.error("GitHub 응답을 읽지 못함 repo={}", repository, e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
    }

    @Override
    public void verify(RepositoryLink repository) {
        try {
            Found found = http.get()
                    .uri("/repos/{owner}/{repo}", repository.owner(), repository.repo())
                    .header("Authorization", "Bearer " + repository.token())
                    .retrieve()
                    .body(Found.class);
            if (found == null || !found.hasIssues()) throw new BusinessException(ErrorCode.GITHUB_ISSUES_DISABLED);
        } catch (RestClientResponseException e) {
            throw translate(e, repository);
        } catch (ResourceAccessException e) {
            log.warn("GitHub에 연결하지 못했거나 응답 대기 시간을 넘김 repo={}", repository, e);
            throw new BusinessException(ErrorCode.GITHUB_UNAVAILABLE);
        } catch (RestClientException e) {
            log.error("GitHub 응답을 읽지 못함 repo={}", repository, e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
    }

    // 401 토큰 만료·해제, 403 권한 부족, 404 레포 없음·접근 불가, 403 한도 초과·429·5xx는 잠시 후 다시
    private BusinessException translate(RestClientResponseException e, RepositoryLink repository) {
        int status = e.getStatusCode().value();
        boolean rateLimited = status == 429
                || (status == 403 && e.getResponseHeaders() != null
                && ("0".equals(e.getResponseHeaders().getFirst("X-RateLimit-Remaining"))
                || e.getResponseHeaders().getFirst("Retry-After") != null));
        if (status == 401) return new BusinessException(ErrorCode.GITHUB_AUTH_REQUIRED);
        if (rateLimited || e.getStatusCode().is5xxServerError()) {
            log.warn("GitHub 이슈 등록을 잠시 못 함 status={} repo={}", status, repository);
            return new BusinessException(ErrorCode.GITHUB_UNAVAILABLE);
        }
        if (status == 403 || status == 404) return new BusinessException(ErrorCode.GITHUB_REPO_UNAVAILABLE);
        log.error("GitHub가 이슈 등록을 거절함 status={} repo={} body={}", status, repository, e.getResponseBodyAsString());
        return new BusinessException(ErrorCode.INTERNAL_ERROR);
    }

    private record NewIssue(String title, String body, List<String> labels) {}

    private record Found(@JsonProperty("has_issues") boolean hasIssues) {}

    private record Created(@JsonProperty("html_url") String htmlUrl, int number) {}
}
