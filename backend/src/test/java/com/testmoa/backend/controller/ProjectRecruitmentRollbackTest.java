package com.testmoa.backend.controller;

import com.testmoa.backend.dto.request.RecruitmentCreateRequest;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.TestItem;
import com.testmoa.backend.entity.Type;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.repository.ProjectRepository;
import com.testmoa.backend.repository.RecruitmentRepository;
import com.testmoa.backend.repository.TestItemRepository;
import com.testmoa.backend.repository.TypeRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.entity.enums.TypeCode;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.service.ProjectService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;

/**
 * 모집 작성 트랜잭션. 테스트에 트랜잭션을 걸면 실제 되돌림과 동시 요청을 볼 수 없어서 따로 둔다
 */
@SpringBootTest
class ProjectRecruitmentRollbackTest {

    @Autowired ProjectService projectService;
    @Autowired UserRepository userRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired RecruitmentRepository recruitmentRepository;
    @MockitoSpyBean TestItemRepository testItemRepository;
    @MockitoSpyBean TypeRepository typeRepository;
    @Autowired JdbcTemplate jdbc;
    @PersistenceContext EntityManager em;

    @Test
    @DisplayName("#92-S7 함께 저장되거나 함께 실패")
    void 항목_저장이_실패하면_모집글도_남지_않는다() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = userRepository.save(User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build());
        Project project = projectRepository.save(Project.builder().user(user).title("북로그").build());
        RecruitmentCreateRequest request = request(project, List.of("https://img.example.com/main.png"));
        long before = recruitmentRepository.count();
        doThrow(new IllegalStateException("저장 실패")).when(testItemRepository).save(any(TestItem.class));

        try {
            assertThatThrownBy(() -> projectService.createRecruitment(user.getId(), request))
                    .isInstanceOf(IllegalStateException.class);

            assertThat(recruitmentRepository.count()).isEqualTo(before);
        } finally {
            projectRepository.delete(project);
            userRepository.delete(user);
        }
    }

    @Test
    @DisplayName("#92-S13 유형을 처음 쓰는 모집 작성 둘이 동시에 와도 둘 다 저장된다")
    void 유형을_동시에_처음_만들어도_한_행만_남는다() throws Exception {
        // 유형 테이블이 빈 배포 직후와 같게 만든다. 다른 테스트는 트랜잭션을 되돌려서 보통 이미 비어 있다
        jdbc.update("DELETE FROM types WHERE code = 'WEB' AND NOT EXISTS (SELECT 1 FROM recruitment_types rt WHERE rt.type_id = types.id)");
        assertThat(typeRepository.findByCode(TypeCode.WEB)).as("WEB 유형을 쓰는 모집이 남아 있으면 이 테스트를 할 수 없다").isEmpty();

        List<User> users = new ArrayList<>();
        List<Project> projects = new ArrayList<>();
        for (int index = 0; index < 2; index++) {
            String suffix = UUID.randomUUID().toString().substring(0, 8);
            User user = userRepository.save(User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                    .role(Role.USER).status(UserStatus.ACTIVE).build());
            users.add(user);
            projects.add(projectRepository.save(Project.builder().user(user).title("북로그").build()));
        }

        // 두 요청이 모두 "유형 없음"을 본 뒤에 만들러 가게 맞춘다. 그래야 겹치는 경우를 매번 재현한다
        CyclicBarrier bothLookedUp = new CyclicBarrier(2);
        Set<Thread> waited = ConcurrentHashMap.newKeySet();
        // 저장소는 인터페이스라 진짜 메서드를 부를 수 없어서, 같은 조회를 그 요청의 트랜잭션에서 직접 한다
        doAnswer(invocation -> {
            Object found = em.createQuery("select t from types t where t.code = :code", Type.class)
                    .setParameter("code", TypeCode.WEB).getResultStream().findFirst();
            if (waited.add(Thread.currentThread())) bothLookedUp.await(10, TimeUnit.SECONDS);
            return found;
        }).when(typeRepository).findByCode(TypeCode.WEB);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        List<Long> created = new ArrayList<>();
        try {
            List<Future<Long>> results = new ArrayList<>();
            for (int index = 0; index < 2; index++) {
                User user = users.get(index);
                RecruitmentCreateRequest request = request(projects.get(index), null);
                results.add(pool.submit(() -> projectService.createRecruitment(user.getId(), request).id()));
            }
            for (Future<Long> result : results) created.add(result.get(30, TimeUnit.SECONDS));

            assertThat(created).hasSize(2);
            Long webRows = jdbc.queryForObject("SELECT count(*) FROM types WHERE code = 'WEB'", Long.class);
            assertThat(webRows).isEqualTo(1);
        } finally {
            pool.shutdownNow();
            for (Long id : created) {
                jdbc.update("DELETE FROM test_items WHERE recruitment_id = ?", id);
                jdbc.update("DELETE FROM recruitment_types WHERE recruitment_id = ?", id);
                jdbc.update("DELETE FROM recruitments WHERE id = ?", id);
            }
            jdbc.update("DELETE FROM types WHERE code = 'WEB' AND NOT EXISTS (SELECT 1 FROM recruitment_types rt WHERE rt.type_id = types.id)");
            projectRepository.deleteAll(projects);
            userRepository.deleteAll(users);
        }
    }

    private RecruitmentCreateRequest request(Project project, List<String> imageUrls) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        return new RecruitmentCreateRequest(project.getId(), "모집", "설명", "web", "firstCome", "https://example.com", null,
                today.plusDays(1), today.plusDays(2), List.of(new RecruitmentCreateRequest.TestItemRequest("항목", null, true, null)),
                imageUrls);
    }
}
