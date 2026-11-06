package com.testmoa.backend.entity;

import com.testmoa.backend.entity.enums.AnalysisStatus;
import com.testmoa.backend.entity.enums.RecruitmentStatus;
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
}
