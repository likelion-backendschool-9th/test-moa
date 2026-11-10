import { expect, test } from "@playwright/test";
import { toApplication, toFeedback, type DeveloperFeedbackResponse } from "@/features/recruitment/backend-map";

const feedback: DeveloperFeedbackResponse = {
  feedbackId: 12, registerId: 7, nickname: "윤슬", testItemId: 3, content: "저장 버튼이 안 눌려요", imageUrls: ["/api/v1/recruitments/images/a.png"],
  submittedAt: "2026-11-09T01:00:00", status: "submitted", recommended: false,
};

test("#190-S7 지원 한 줄을 id와 닉네임으로 바꾸고 상태와 일시는 그대로 둔다", () => {
  expect(toApplication({ registerId: 7, nickname: "윤슬", status: "applied", appliedAt: "2026-11-09T01:00:00", feedbackSubmitted: false })).toEqual({
    id: "7", registerId: "7", testerNickname: "윤슬", status: "applied", appliedAt: "2026-11-09T01:00:00",
  });
});

test("#190-S7 피드백의 항목 id·이미지를 화면 모양으로 바꾸고 기타 의견은 항목이 null이다", () => {
  expect(toFeedback(feedback)).toMatchObject({
    id: "12", registerId: "7", testerNickname: "윤슬", testItemId: "3", status: "waiting", recommended: false,
    images: [{ url: "/api/v1/recruitments/images/a.png", name: "윤슬님의 피드백 이미지 1" }],
  });
  expect(toFeedback({ ...feedback, testItemId: null, imageUrls: [] })).toMatchObject({ testItemId: null, images: [] });
});

test("#190-S7 피드백 상태는 제출=신고 대기, 신고·보상 제외=신고됨, 보상=지급 완료로 보여 준다", () => {
  const status = (value: string) => toFeedback({ ...feedback, status: value }).status;
  expect([status("submitted"), status("reported"), status("excluded"), status("rewarded")]).toEqual(["waiting", "reported", "reported", "paid"]);
});
