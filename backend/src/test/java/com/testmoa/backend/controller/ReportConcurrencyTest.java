package com.testmoa.backend.controller;

import com.testmoa.backend.dto.request.ReportCreateRequest;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.ReportTargetType;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.service.ReportService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * 신고 접수의 동시 요청과 롤백(#85). 테스트 전체를 트랜잭션으로 감싸면 확인할 수 없어서 ReportControllerTest와 나누고,
 * AuthConcurrencyTest와 같은 설정이라 실행 환경을 함께 쓴다. 만든 행은 직접 지운다
 */
@SpringBootTest
@AutoConfigureMockMvc
class ReportConcurrencyTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired JwtProvider jwt;
    @Autowired UserRepository userRepository;
    @Autowired ReportService reportService;
    @Autowired TransactionTemplate transaction;
    @Value("${upload.dir}") String uploadDir;

    private final String suffix = UUID.randomUUID().toString().substring(0, 8);
    private User reporter, target;
    private final List<Long> admins = new ArrayList<>();

    @BeforeEach
    void setUp() {
        reporter = userRepository.save(user("동시신고" + suffix));
        target = userRepository.save(user("동시대상" + suffix));
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("delete from report_evidences where report_id in (select id from reports where user_id = ?)", reporter.getId());
        jdbc.update("delete from reports where user_id = ?", reporter.getId());
        jdbc.update("delete from users where id in (?, ?)", reporter.getId(), target.getId());
        admins.forEach(id -> jdbc.update("delete from users where id = ?", id));
    }

    private static User user(String nickname) {
        return User.builder().nickname(nickname).email(nickname + "@example.com").role(Role.USER).status(UserStatus.ACTIVE).build();
    }

    private int reportUser() throws Exception {
        return mvc.perform(multipart("/api/v1/reports")
                        .param("targetType", "USER").param("targetId", target.getId().toString()).param("reason", "동시 신고")
                        .header("Authorization", "Bearer " + jwt.createAccessToken(reporter.getId())))
                .andReturn().getResponse().getStatus();
    }

    @Test
    @DisplayName("#85-S7 같은 회원이 같은 대상을 동시에 두 번 신고해도 하나만 저장되고 나머지는 409")
    void 동시에_같은_대상을_신고해도_하나만_저장된다() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(4);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            results.add(pool.submit(() -> {
                start.await();
                return reportUser();
            }));
        }
        start.countDown();
        List<Integer> statuses = new ArrayList<>();
        for (Future<Integer> result : results) statuses.add(result.get());
        pool.shutdown();

        assertThat(statuses).containsOnlyOnce(201).containsOnly(201, 409);
        assertThat(jdbc.queryForObject("select count(*) from reports where user_id = ? and target_id = ?", Integer.class,
                reporter.getId(), target.getId())).isEqualTo(1);
    }

    @Test
    @DisplayName("#85-S8 신고가 최종 롤백되면 저장한 증거 파일도 남지 않는다")
    void 롤백되면_증거_파일이_남지_않는다() {
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3};
        long before = countFiles();

        // 신고 접수는 성공했지만 바깥 트랜잭션이 롤백된다
        transaction.executeWithoutResult(status -> {
            reportService.create(reporter.getId(),
                    new ReportCreateRequest(ReportTargetType.USER, target.getId(), null, "롤백될 신고"),
                    List.of(new MockMultipartFile("files", "a.png", "image/png", png)));
            assertThat(countFiles()).isEqualTo(before + 1);
            status.setRollbackOnly();
        });

        assertThat(countFiles()).isEqualTo(before);
        assertThat(jdbc.queryForObject("select count(*) from reports where user_id = ?", Integer.class, reporter.getId())).isZero();
    }

    private long countFiles() {
        Path folder = Path.of(uploadDir, "reports");
        if (!Files.isDirectory(folder)) return 0;
        try (Stream<Path> files = Files.list(folder)) {
            return files.count();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Test
    @DisplayName("#85-S16 두 운영자가 같은 신고를 동시에 판정해도 하나만 된다")
    void 동시_판정은_하나만() throws Exception {
        Long reportId = reportService.create(reporter.getId(),
                new ReportCreateRequest(ReportTargetType.USER, target.getId(), null, "동시 판정"), List.of()).id();
        List<User> reviewers = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            User admin = userRepository.save(User.builder().nickname("동시운영" + i + suffix).email("op" + i + suffix + "@example.com")
                    .role(Role.ADMIN).status(UserStatus.ACTIVE).build());
            admins.add(admin.getId());
            reviewers.add(admin);
        }
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            User admin = reviewers.get(i);
            String result = i == 0 ? "REJECTED" : "ACCEPTED";
            results.add(pool.submit(() -> {
                start.await();
                return mvc.perform(post("/api/v1/admin/reports/" + reportId + "/review")
                                .contentType(MediaType.APPLICATION_JSON).content("{\"result\":\"" + result + "\"}")
                                .header("Authorization", "Bearer " + jwt.createAccessToken(admin.getId())))
                        .andReturn().getResponse().getStatus();
            }));
        }
        start.countDown();
        List<Integer> statuses = new ArrayList<>();
        for (Future<Integer> result : results) statuses.add(result.get());
        pool.shutdown();

        assertThat(statuses).containsExactlyInAnyOrder(200, 409);
        assertThat(jdbc.queryForObject("select count(*) from reports where id = ? and status <> 'PENDING' and reviewer_id is not null",
                Integer.class, reportId)).isEqualTo(1);
    }
}
