package com.testmoa.backend.domain.entity;

import com.testmoa.backend.global.common.FeedbackStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.*;

class FeedbackTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 5, 10, 0);

    private Feedback submitted() {
        return Feedback.builder().content("내용").submittedAt(NOW).build();
    }

    private Feedback reported() {
        Feedback feedback = submitted();
        feedback.report();
        return feedback;
    }

    private Feedback rewarded() {
        Feedback feedback = submitted();
        feedback.reward();
        return feedback;
    }

    private Feedback excluded() {
        Feedback feedback = reported();
        feedback.exclude();
        return feedback;
    }

    private void assertRejected(Feedback feedback, Consumer<Feedback> action) {
        FeedbackStatus before = feedback.getStatus();
        assertThrows(IllegalStateException.class, () -> action.accept(feedback));
        assertEquals(before, feedback.getStatus());
    }

    @Test
    @DisplayName("#89-S18 항목별 피드백을 같은 시각으로 저장")
    void 한_번에_낸_피드백은_제출_시각이_같다() {
        Register register = Register.builder().build();
        TestItem first = TestItem.builder().title("검색").required(true).build();
        TestItem second = TestItem.builder().title("저장").required(false).build();

        Feedback firstFeedback = Feedback.builder().register(register).testItem(first).content("첫 항목").submittedAt(NOW).build();
        Feedback secondFeedback = Feedback.builder().register(register).testItem(second).content("둘째 항목").submittedAt(NOW).build();

        for (Feedback feedback : List.of(firstFeedback, secondFeedback)) {
            assertEquals(FeedbackStatus.SUBMITTED, feedback.getStatus());
            assertFalse(feedback.isRecommended());
            assertEquals(NOW, feedback.getSubmittedAt());
        }
        assertSame(first, firstFeedback.getTestItem());
        assertSame(second, secondFeedback.getTestItem());
    }

    @Test
    @DisplayName("#89-S19 기타 의견")
    void 기타_의견은_테스트_항목이_없다() {
        assertNull(submitted().getTestItem());
    }

    @Test
    @DisplayName("#89-S21 추천과 추천 취소")
    void 추천_여부를_바꾼다() {
        Feedback feedback = submitted();

        feedback.updateRecommended(true);
        assertTrue(feedback.isRecommended());

        feedback.updateRecommended(false);
        assertFalse(feedback.isRecommended());
    }

    @Test
    @DisplayName("#89-S22 신고 접수")
    void report는_제출에서_신고됨으로_바꾼다() {
        assertEquals(FeedbackStatus.REPORTED, reported().getStatus());
    }

    @Test
    @DisplayName("#89-S23 보상 지급")
    void reward는_제출과_신고됨에서_된다() {
        for (Feedback feedback : List.of(submitted(), reported())) {
            feedback.reward();
            assertEquals(FeedbackStatus.REWARDED, feedback.getStatus());
        }
    }

    @Test
    @DisplayName("#89-S24 보상 제외")
    void exclude는_신고됨에서_된다() {
        assertEquals(FeedbackStatus.EXCLUDED, excluded().getStatus());
    }

    @Test
    @DisplayName("#89-S25 허용하지 않는 상태 변경")
    void 허용하지_않는_상태_변경을_거절한다() {
        assertRejected(submitted(), Feedback::exclude);
        assertRejected(reported(), Feedback::report);
        for (Feedback feedback : List.of(rewarded(), excluded())) {
            assertRejected(feedback, Feedback::report);
            assertRejected(feedback, Feedback::reward);
            assertRejected(feedback, Feedback::exclude);
        }
    }
}
