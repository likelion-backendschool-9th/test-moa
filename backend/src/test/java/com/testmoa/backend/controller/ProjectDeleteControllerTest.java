package com.testmoa.backend.controller;

import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 프로젝트 삭제(#287). 요청부터 DB까지 확인한다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProjectDeleteControllerTest {
    private static final String BASE = "/api/v1/developer/projects";

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;

    private User developer;

    @BeforeEach
    void setUp() {
        developer = saveUser();
    }

    private User saveUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build();
        em.persist(user);
        return user;
    }

    private Project saveProject(User owner) {
        Project project = Project.builder().user(owner).title("북로그").imageUrl("/api/v1/images/booklog.png").build();
        em.persist(project);
        return project;
    }

    private Recruitment saveRecruitment(Project project) {
        Recruitment recruitment = Recruitment.builder().project(project).title("북로그 1차 테스트").description("써 봐 주세요")
                .conditions("누구나").accessUrl("https://booklog.example.com")
                .recruitDeadline(LocalDateTime.now().plusDays(3)).feedbackDeadline(LocalDateTime.now().plusDays(10))
                .selectionMode(SelectionMode.FIRST_COME).build();
        em.persist(recruitment);
        return recruitment;
    }

    // user가 null이면 토큰 없이 보낸다
    private ResultActions send(User user, MockHttpServletRequestBuilder request) throws Exception {
        if (user != null) request.header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId()));
        em.flush();
        em.clear();
        return mvc.perform(request);
    }

    private boolean exists(Project project) {
        em.flush();
        em.clear();
        return em.find(Project.class, project.getId()) != null;
    }

    @Test
    @DisplayName("#287-S1 모집글이 없는 프로젝트를 삭제한다")
    void 모집글이_없으면_삭제되고_목록과_상세에서_사라진다() throws Exception {
        Project project = saveProject(developer);
        project.connectRepository("moa/booklog", "github_pat_test");

        send(developer, delete(BASE + "/" + project.getId())).andExpect(status().isOk());

        assertThat(exists(project)).isFalse();
        send(developer, get(BASE)).andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(0));
        send(developer, get(BASE + "/" + project.getId())).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("#287-S2 모집글이 있으면 삭제할 수 없다")
    void 취소한_모집글만_있어도_409이고_프로젝트가_남는다() throws Exception {
        Project open = saveProject(developer);
        saveRecruitment(open);
        Project cancelledOnly = saveProject(developer);
        saveRecruitment(cancelledOnly).cancel(null, LocalDateTime.now());

        for (Project project : new Project[]{open, cancelledOnly}) {
            send(developer, delete(BASE + "/" + project.getId())).andExpect(status().isConflict())
                    .andExpect(jsonPath("$.error.code").value("PROJECT_NOT_DELETABLE"));
            assertThat(exists(project)).isTrue();
        }
    }

    @Test
    @DisplayName("#287-S3 다른 회원의 프로젝트와 비로그인")
    void 다른_회원의_프로젝트는_404이고_비로그인은_401이다() throws Exception {
        Project project = saveProject(developer);

        send(saveUser(), delete(BASE + "/" + project.getId())).andExpect(status().isNotFound());
        send(null, delete(BASE + "/" + project.getId())).andExpect(status().isUnauthorized());
        send(developer, delete(BASE + "/999999999")).andExpect(status().isNotFound());
        assertThat(exists(project)).isTrue();
    }
}
