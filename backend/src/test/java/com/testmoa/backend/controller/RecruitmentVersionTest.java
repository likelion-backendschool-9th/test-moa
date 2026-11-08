package com.testmoa.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.RecruitmentStatus;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 모집글 버전(#177). 같은 프로젝트에 모집을 새로 올릴 때마다 1, 2, 3으로 올라간다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RecruitmentVersionTest {
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;

    static Map<String, Object> body(Long projectId) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        return Map.of("projectId", projectId, "title", "북로그 베타", "description", "써 봐 주세요", "softwareType", "web",
                "selectionMode", "firstCome", "accessUrl", "https://booklog.example.com",
                "recruitDeadline", today.plusDays(3).toString(), "submitDeadline", today.plusDays(9).toString(),
                "testItems", List.of(Map.of("title", "책 등록하기", "required", true, "imageUrls", List.of())));
    }

    private User saveUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build();
        em.persist(user);
        return user;
    }

    private Project saveProject(User owner, String title) {
        Project project = Project.builder().user(owner).title(title).build();
        em.persist(project);
        return project;
    }

    private int create(User user, Project project) throws Exception {
        String response = mvc.perform(post("/api/v1/developer/recruitments")
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId()))
                        .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body(project.getId()))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long id = JSON.readTree(response).at("/data/id").asLong();
        em.flush();
        em.clear();
        return em.find(Recruitment.class, id).getVersion();
    }

    @Test
    @DisplayName("#177-S1 프로젝트마다 1, 2, 3으로 올라가고 취소한 모집도 번호를 차지한다")
    void 프로젝트마다_버전이_올라간다() throws Exception {
        User me = saveUser();
        Project booklog = saveProject(me, "북로그");
        Project other = saveProject(me, "가계부");

        assertThat(create(me, booklog)).isEqualTo(1);
        assertThat(create(me, booklog)).isEqualTo(2);
        /* 다른 프로젝트는 따로 센다 */
        assertThat(create(me, other)).isEqualTo(1);

        /* 버전 2를 취소해도 번호를 차지해 다음은 3이다 */
        Recruitment cancelled = em.createQuery("select r from recruitments r where r.project.id = :id and r.version = 2", Recruitment.class)
                .setParameter("id", booklog.getId()).getSingleResult();
        ReflectionTestUtils.setField(cancelled, "status", RecruitmentStatus.CANCELLED);
        em.flush();
        assertThat(create(me, booklog)).isEqualTo(3);
    }

    @Test
    @DisplayName("#177-S2 버전이 모두 1인 기존 모집이 있는 프로젝트는 2부터 이어진다")
    void 기존_모집_뒤로_이어진다() throws Exception {
        User me = saveUser();
        Project booklog = saveProject(me, "북로그");
        for (int i = 0; i < 2; i++) {
            em.persist(Recruitment.builder().project(booklog).title("예전 모집")
                    .recruitDeadline(LocalDateTime.now().plusDays(3)).feedbackDeadline(LocalDateTime.now().plusDays(9))
                    .selectionMode(SelectionMode.FIRST_COME).build());
        }

        assertThat(create(me, booklog)).isEqualTo(2);
        assertThat(create(me, booklog)).isEqualTo(3);
    }
}
