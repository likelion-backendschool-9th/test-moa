package com.testmoa.backend.controller;

import com.testmoa.backend.domain.dto.request.RecruitmentCreateRequest;
import com.testmoa.backend.domain.entity.Project;
import com.testmoa.backend.domain.entity.TestItem;
import com.testmoa.backend.domain.entity.User;
import com.testmoa.backend.domain.repository.ProjectRepository;
import com.testmoa.backend.domain.repository.RecruitmentRepository;
import com.testmoa.backend.domain.repository.TestItemRepository;
import com.testmoa.backend.domain.repository.UserRepository;
import com.testmoa.backend.global.common.Role;
import com.testmoa.backend.global.common.UserStatus;
import com.testmoa.backend.service.ProjectService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

/**
 * 모집 작성 트랜잭션. 테스트에 트랜잭션을 걸면 실제 되돌림을 볼 수 없어서 따로 둔다
 */
@SpringBootTest
class ProjectRecruitmentRollbackTest {

    @Autowired ProjectService projectService;
    @Autowired UserRepository userRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired RecruitmentRepository recruitmentRepository;
    @MockitoSpyBean TestItemRepository testItemRepository;

    @Test
    @DisplayName("#92-S7 함께 저장되거나 함께 실패")
    void 항목_저장이_실패하면_모집글도_남지_않는다() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = userRepository.save(User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build());
        Project project = projectRepository.save(Project.builder().user(user).title("북로그").build());
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        RecruitmentCreateRequest request = new RecruitmentCreateRequest(project.getId(), "모집", "설명", "web", "firstCome", "https://example.com", null,
                today.plusDays(1), today.plusDays(2), List.of(new RecruitmentCreateRequest.TestItemRequest("항목", null, true, null)),
                List.of("https://img.example.com/main.png"));
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
}
