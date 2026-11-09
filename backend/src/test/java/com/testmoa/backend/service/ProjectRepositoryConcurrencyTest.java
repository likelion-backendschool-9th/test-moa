package com.testmoa.backend.service;

import com.testmoa.backend.dto.request.ProjectSaveRequest;
import com.testmoa.backend.dto.request.RepositoryConnectRequest;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.client.GitHubIssueClient;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.ProjectRepository;
import com.testmoa.backend.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

/**
 * 저장소 연결이 GitHub 확인을 기다리는 사이 다른 요청이 고친 프로젝트 정보를 덮어쓰지 않는다(#227).
 * 두 요청이 실제로 커밋돼야 해서 테스트 트랜잭션 없이 돌리고, 끝나면 만든 행을 지운다
 */
@SpringBootTest
class ProjectRepositoryConcurrencyTest {

    @Autowired ProjectService projectService;
    @Autowired ProjectRepository projectRepository;
    @Autowired UserRepository userRepository;
    @MockitoBean GitHubIssueClient gitHubIssueClient;

    private Long userId;
    private Long projectId;

    @AfterEach
    void cleanUp() {
        if (projectId != null) projectRepository.deleteById(projectId);
        if (userId != null) userRepository.deleteById(userId);
    }

    @Test
    @DisplayName("#227-S12 GitHub 확인을 기다리는 사이 고친 이름·설명·이미지는 연결을 끝내도 그대로다")
    void 연결이_사이의_수정을_덮어쓰지_않는다() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        userId = userRepository.save(User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build()).getId();
        projectId = projectRepository.save(Project.builder().user(userRepository.getReferenceById(userId))
                .title("옛 이름").description("옛 설명").imageUrl("https://example.com/old.png").build()).getId();

        CountDownLatch verifying = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        doAnswer(call -> {
            verifying.countDown();
            release.await(10, TimeUnit.SECONDS);
            return null;
        }).when(gitHubIssueClient).verify(any());

        CompletableFuture<Void> connecting = CompletableFuture.runAsync(() ->
                projectService.connectRepository(userId, projectId, new RepositoryConnectRequest("octo/booklog", "ghp_token")));
        assertThat(verifying.await(10, TimeUnit.SECONDS)).isTrue();

        projectService.update(userId, projectId, new ProjectSaveRequest("새 이름", "새 설명", "https://example.com/new.png"));
        release.countDown();
        connecting.get(10, TimeUnit.SECONDS);

        Project saved = projectRepository.findById(projectId).orElseThrow();
        assertThat(saved.getGithubRepository()).isEqualTo("octo/booklog");
        assertThat(saved.getTitle()).isEqualTo("새 이름");
        assertThat(saved.getDescription()).isEqualTo("새 설명");
        assertThat(saved.getImageUrl()).isEqualTo("https://example.com/new.png");
    }
}
