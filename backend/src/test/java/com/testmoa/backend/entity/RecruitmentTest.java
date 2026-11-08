package com.testmoa.backend.entity;

import com.testmoa.backend.entity.enums.AnalysisStatus;
import com.testmoa.backend.entity.enums.RecruitmentPhase;
import com.testmoa.backend.entity.enums.RecruitmentStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class RecruitmentTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 5, 10, 0);

    private Recruitment newRecruitment() {
        return Recruitment.builder().title("1차 모집").build();
    }

    @Test
    @DisplayName("#89-S5 사유를 적고 취소")
    void cancel은_사유와_시각을_남긴다() {
        Recruitment recruitment = newRecruitment();

        recruitment.cancel("서버 장애", NOW);

        assertEquals(RecruitmentStatus.CANCELLED, recruitment.getStatus());
        assertEquals("서버 장애", recruitment.getCancelReason());
        assertEquals(NOW, recruitment.getCancelledAt());
    }

    @Test
    @DisplayName("#89-S6 사유 없이 취소")
    void cancel은_사유가_없어도_된다() {
        Recruitment recruitment = newRecruitment();

        recruitment.cancel(null, NOW);

        assertEquals(RecruitmentStatus.CANCELLED, recruitment.getStatus());
        assertNull(recruitment.getCancelReason());
        assertEquals(NOW, recruitment.getCancelledAt());
    }

    @Test
    @DisplayName("#89-S7 모집글 시작 값")
    void 만들_때_시작_값이_정해진다() {
        Recruitment recruitment = newRecruitment();

        assertEquals(RecruitmentStatus.RECRUITING, recruitment.getStatus());
        assertEquals(1, recruitment.getVersion());
        assertEquals(AnalysisStatus.NONE, recruitment.getAnalysisStatus());
        assertNull(recruitment.getCancelReason());
        assertNull(recruitment.getCancelledAt());
    }

    @Test
    @DisplayName("#89-S8 다시 취소할 수 없음")
    void cancel은_이미_취소했으면_거절한다() {
        Recruitment recruitment = newRecruitment();
        recruitment.cancel("처음 사유", NOW);

        assertThrows(IllegalStateException.class, () -> recruitment.cancel("다른 사유", NOW.plusDays(1)));

        assertEquals("처음 사유", recruitment.getCancelReason());
        assertEquals(NOW, recruitment.getCancelledAt());
    }

    @Test
    @DisplayName("#113-S7 진행 단계는 저장 상태와 마감일로 계산한다")
    void 진행_단계() {
        LocalDateTime now = LocalDateTime.of(2026, 11, 8, 12, 0);
        Recruitment recruitment = Recruitment.builder().title("1차 모집")
                .recruitDeadline(now.plusDays(1)).feedbackDeadline(now.plusDays(8)).build();

        assertEquals(RecruitmentPhase.RECRUITING, recruitment.phaseAt(now));
        assertEquals(RecruitmentPhase.TESTING, recruitment.phaseAt(now.plusDays(1)));
        assertEquals(RecruitmentPhase.CLOSED, recruitment.phaseAt(now.plusDays(8)));

        /* 저장 상태가 RECRUITING이 아니면 마감일이 남아도 종료다(지금은 CLOSED를 저장하는 코드가 없다) */
        ReflectionTestUtils.setField(recruitment, "status", RecruitmentStatus.CLOSED);
        assertEquals(RecruitmentPhase.CLOSED, recruitment.phaseAt(now));

        recruitment = Recruitment.builder().title("2차 모집").recruitDeadline(now.plusDays(1)).feedbackDeadline(now.plusDays(8)).build();
        recruitment.cancel(null, now);
        assertEquals(RecruitmentPhase.CANCELLED, recruitment.phaseAt(now));
    }
}
