package com.testmoa.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.client.GitHubIssueClient;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.service.ProjectRepositoryLinkProvider;
import com.testmoa.backend.service.ProjectRepositoryLinkProvider.RepositoryLink;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 프로젝트에 GitHub 레포 연결(#227). 요청부터 DB까지 확인하고, GitHub는 가짜로 바꾼다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProjectRepositoryLinkTest {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String TOKEN = "ghp_secretTokenValue123";

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;
    @Autowired ProjectRepositoryLinkProvider linkProvider;
    @MockitoBean GitHubIssueClient gitHubIssueClient;

    private User me;
    private User other;
    private Project project;

    @BeforeEach
    void setUp() {
        me = saveUser();
        other = saveUser();
        project = Project.builder().user(me).title("북로그").build();
        em.persist(project);
    }

    private User saveUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build();
        em.persist(user);
        return user;
    }

    private ResultActions connect(User user, Object body) throws Exception {
        ResultActions result = mvc.perform(put("/api/v1/developer/projects/{id}/repository", project.getId())
                .header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId()))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body)));
        em.flush();
        em.clear();
        return result;
    }

    private ResultActions disconnect(User user) throws Exception {
        ResultActions result = mvc.perform(delete("/api/v1/developer/projects/{id}/repository", project.getId())
                .header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId())));
        em.flush();
        em.clear();
        return result;
    }

    private Project saved() {
        return em.find(Project.class, project.getId());
    }

    @Test
    @DisplayName("#227-S1 GitHub 주소로 연결하면 owner/repo로 저장하고 GitHub로 확인한다")
    void 연결한다() throws Exception {
        connect(me, Map.of("repository", " https://github.com/Octo/booklog.git/ ", "token", " " + TOKEN + " "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.repository").value("Octo/booklog"));

        verify(gitHubIssueClient).verify(new RepositoryLink("Octo", "booklog", TOKEN));
        assertThat(saved().getGithubRepository()).isEqualTo("Octo/booklog");
        assertThat(saved().getGithubToken()).isEqualTo(TOKEN);

        // owner/repo 형태로 다시 연결하면 바뀐다
        connect(me, Map.of("repository", "octo/booklog-web", "token", TOKEN))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.repository").value("octo/booklog-web"));
        assertThat(saved().getGithubRepository()).isEqualTo("octo/booklog-web");
    }

    @Test
    @DisplayName("#227-S2 형식이 틀리거나 GitHub가 거절하면 저장하지 않고 이유를 알려 준다")
    void 확인에_실패하면_저장하지_않는다() throws Exception {
        for (String repository : new String[]{"booklog", "octo/", "https://example.com/octo/booklog", "octo/..", "octo/book log", "a/b/c"}) {
            connect(me, Map.of("repository", repository, "token", TOKEN))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.fields.repository").exists());
        }
        connect(me, Map.of("repository", "octo/booklog", "token", " ")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.token").exists());
        verify(gitHubIssueClient, never()).verify(any());

        for (ErrorCode code : new ErrorCode[]{ErrorCode.GITHUB_REPO_UNAVAILABLE, ErrorCode.GITHUB_AUTH_REQUIRED,
                ErrorCode.GITHUB_ISSUES_DISABLED, ErrorCode.GITHUB_UNAVAILABLE}) {
            willThrow(new BusinessException(code)).given(gitHubIssueClient).verify(any());
            connect(me, Map.of("repository", "octo/booklog", "token", TOKEN))
                    .andExpect(status().is(code.getStatus().value())).andExpect(jsonPath("$.error.code").value(code.name()));
        }
        assertThat(saved().getGithubRepository()).isNull();
        assertThat(saved().getGithubToken()).isNull();
    }

    @Test
    @DisplayName("#227-S3 토큰은 DB에 암호문으로 저장하고 응답 어디에도 나오지 않는다")
    void 토큰은_암호화한다() throws Exception {
        String body = connect(me, Map.of("repository", "octo/booklog", "token", TOKEN))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain(TOKEN);

        Object raw = em.createNativeQuery("select github_token from projects where id = :id")
                .setParameter("id", project.getId()).getSingleResult();
        assertThat((String) raw).isNotBlank().doesNotContain(TOKEN);

        for (String path : new String[]{"/api/v1/developer/projects", "/api/v1/developer/projects/" + project.getId()}) {
            String read = mvc.perform(get(path).header("Authorization", "Bearer " + jwtProvider.createAccessToken(me.getId())))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            assertThat(read).contains("octo/booklog").doesNotContain(TOKEN);
        }
    }

    @Test
    @DisplayName("#227-S4 프로젝트 응답에 연결한 저장소가 보이고 연결 전에는 null이다")
    void 응답에_저장소가_보인다() throws Exception {
        String auth = "Bearer " + jwtProvider.createAccessToken(me.getId());
        mvc.perform(get("/api/v1/developer/projects/{id}", project.getId()).header("Authorization", auth))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.repository").value(nullValue()));
        connect(me, Map.of("repository", "octo/booklog", "token", TOKEN)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/developer/projects/{id}", project.getId()).header("Authorization", auth))
                .andExpect(jsonPath("$.data.repository").value("octo/booklog"));
    }

    @Test
    @DisplayName("#227-S5 연결을 해제하면 저장소와 토큰이 지워져 이슈를 올릴 레포가 없다")
    void 해제한다() throws Exception {
        connect(me, Map.of("repository", "octo/booklog", "token", TOKEN)).andExpect(status().isOk());
        assertThat(linkProvider.find(project.getId())).isPresent();

        disconnect(me).andExpect(status().isOk()).andExpect(jsonPath("$.data.repository").value(nullValue()));
        assertThat(saved().getGithubRepository()).isNull();
        assertThat(saved().getGithubToken()).isNull();
        assertThat(linkProvider.find(project.getId())).isEmpty();

        // 연결하지 않았어도 해제는 성공이다
        disconnect(me).andExpect(status().isOk());
    }

    @Test
    @DisplayName("#227-S6 이슈 등록이 찾는 연결은 사용자가 입력한 레포와 토큰이다")
    void 입력한_레포로_이슈를_올린다() throws Exception {
        assertThat(linkProvider.find(project.getId())).isEmpty();
        connect(me, Map.of("repository", "https://github.com/octo/booklog", "token", TOKEN)).andExpect(status().isOk());

        RepositoryLink link = linkProvider.find(project.getId()).orElseThrow();
        assertThat(link).isEqualTo(new RepositoryLink("octo", "booklog", TOKEN));
        assertThat(link.toString()).doesNotContain(TOKEN);
    }

    @Test
    @DisplayName("#227-S7 다른 회원의 프로젝트와 없는 프로젝트는 404이고 GitHub를 부르지 않는다. 비로그인은 401이다")
    void 남의_프로젝트는_404다() throws Exception {
        connect(other, Map.of("repository", "octo/booklog", "token", TOKEN))
                .andExpect(status().isNotFound());
        disconnect(other).andExpect(status().isNotFound());
        verify(gitHubIssueClient, never()).verify(any());
        assertThat(saved().getGithubRepository()).isNull();

        mvc.perform(put("/api/v1/developer/projects/{id}/repository", 999_999_999L)
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(me.getId()))
                        .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(Map.of("repository", "octo/booklog", "token", TOKEN))))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/developer/projects/{id}/repository", project.getId())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
