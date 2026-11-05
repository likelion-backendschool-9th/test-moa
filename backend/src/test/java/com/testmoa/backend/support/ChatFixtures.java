package com.testmoa.backend.support;

import com.testmoa.backend.domain.entity.ChatParticipant;
import com.testmoa.backend.domain.entity.ChatRoom;
import com.testmoa.backend.domain.entity.Project;
import com.testmoa.backend.domain.entity.Recruitment;
import com.testmoa.backend.domain.entity.Register;
import com.testmoa.backend.domain.entity.User;
import com.testmoa.backend.global.common.ChatRole;
import com.testmoa.backend.global.common.Role;
import com.testmoa.backend.global.common.SelectionMode;
import com.testmoa.backend.global.common.UserStatus;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import java.time.LocalDateTime;

/** 채팅 테스트에 필요한 회원, 모집 건(프로젝트 포함), 선정된 참가를 저장한다 */
public class ChatFixtures {
    private final TestEntityManager em;

    public ChatFixtures(TestEntityManager em) {
        this.em = em;
    }

    public User user(String nickname) {
        return em.persist(User.builder()
                .nickname(nickname)
                .email(nickname + "@test.com")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build());
    }

    /** 개발자의 프로젝트와 그 프로젝트의 모집 건 */
    public Recruitment recruitment(User developer, String title) {
        Project project = em.persist(Project.builder()
                .user(developer)
                .title(title)
                .build());
        LocalDateTime now = LocalDateTime.now();
        return em.persist(Recruitment.builder()
                .project(project)
                .title(title + " 모집")
                .recruitDeadline(now.plusDays(7))
                .feedbackDeadline(now.plusDays(14))
                .selectionMode(SelectionMode.MANUAL)
                .build());
    }

    /** 테스터가 모집 건에 지원해 선정된(CONFIRMED) 참가 */
    public Register confirmedRegister(Recruitment recruitment, User tester) {
        Register register = Register.builder()
                .recruitment(recruitment)
                .user(tester)
                .build();
        register.confirm(0, 0, LocalDateTime.now());
        return em.persist(register);
    }

    public static ChatParticipant participantWithRole(ChatRoom room, ChatRole role) {
        return room.getParticipants().stream().filter(p -> p.getRole() == role).findFirst().orElseThrow();
    }
}
