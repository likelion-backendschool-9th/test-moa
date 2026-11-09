package com.testmoa.backend.global.client;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.core.read.ListAppender;
import com.testmoa.backend.dto.request.RepositoryConnectRequest;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.ProjectRepositoryLinkProvider.RepositoryLink;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * #227-R2 토큰은 로그에 남지 않는다. 헤더에 넣을 수 없는 문자가 섞인 토큰도 마찬가지다
 */
class GitHubRestIssueClientTest {
    private static final String SECRET = "ghp_fake_secret_FOR_REVIEW_한";

    private final Logger clientLogger = (Logger) LoggerFactory.getLogger(GitHubRestIssueClient.class);
    private final ListAppender<ILoggingEvent> logs = new ListAppender<>();

    @BeforeEach
    void attachAppender() {
        logs.start();
        clientLogger.addAppender(logs);
    }

    @AfterEach
    void detachAppender() {
        clientLogger.detachAppender(logs);
    }

    @Test
    @DisplayName("헤더에 넣을 수 없는 문자가 든 토큰은 인증 오류로 거절하고, 토큰을 로그에 남기지 않는다")
    void invalidTokenIsNotLogged() {
        var client = new GitHubRestIssueClient();
        var repository = new RepositoryLink("owner", "repo", SECRET);

        assertThatThrownBy(() -> client.verify(repository))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.GITHUB_AUTH_REQUIRED));
        assertThatThrownBy(() -> client.create(repository, "제목", "본문", List.of()))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.GITHUB_AUTH_REQUIRED));

        assertThat(logs.list).isNotEmpty();
        for (ILoggingEvent event : logs.list) {
            assertThat(event.getFormattedMessage()).doesNotContain(SECRET);
            for (IThrowableProxy t = event.getThrowableProxy(); t != null; t = t.getCause()) {
                assertThat(t.getMessage()).doesNotContain(SECRET);
            }
        }
    }

    @Test
    @DisplayName("토큰에 한글이나 공백이 섞이면 요청 검사에서 token 칸 오류로 거절한다")
    void invalidCharactersAreRejectedByValidation() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            Validator validator = factory.getValidator();
            assertThat(validator.validate(new RepositoryConnectRequest("owner/repo", SECRET)))
                    .extracting(v -> v.getPropertyPath().toString()).containsExactly("token");
            assertThat(validator.validate(new RepositoryConnectRequest("owner/repo", "ghp_abc def")))
                    .extracting(v -> v.getPropertyPath().toString()).containsExactly("token");
            assertThat(validator.validate(new RepositoryConnectRequest("owner/repo", " github_pat_AbC123-x \n"))).isEmpty();
        }
    }
}
