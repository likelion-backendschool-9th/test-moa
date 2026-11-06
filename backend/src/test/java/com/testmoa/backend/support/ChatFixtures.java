package com.testmoa.backend.support;

import com.testmoa.backend.entity.ChatParticipant;
import com.testmoa.backend.entity.ChatRoom;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.ChatRole;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.UserStatus;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import java.time.LocalDateTime;

/** 채팅 테스트에 필요한 회원, 모집 건(프로젝트 포함), 선정된 참가를 저장한다 */
public class ChatFixtures {
    private final jakarta.persistence.EntityManager em;

    public ChatFixtures(TestEntityManager em) {
        this(em.getEntityManager());
    }

    public ChatFixtures(jakarta.persistence.EntityManager em) {
        this.em = em;
    }

    private <T> T persist(T entity) {
        em.persist(entity);
        return entity;
    }

    public User user(String nickname) {
        return persist(User.builder()
                .nickname(nickname)
                .email(nickname + "@test.com")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build());
    }

    /** 개발자의 프로젝트와 그 프로젝트의 모집 건 */
    public Recruitment recruitment(User developer, String title) {
        return recruitment(developer, title, null);
    }

    public Recruitment recruitment(User developer, String title, String imageUrl) {
        Project project = persist(Project.builder()
                .user(developer)
                .title(title)
                .imageUrl(imageUrl)
                .build());
        LocalDateTime now = LocalDateTime.now();
        return persist(Recruitment.builder()
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
        return persist(register);
    }

    public static ChatParticipant participantWithRole(ChatRoom room, ChatRole role) {
        return room.getParticipants().stream().filter(p -> p.getRole() == role).findFirst().orElseThrow();
    }
}
