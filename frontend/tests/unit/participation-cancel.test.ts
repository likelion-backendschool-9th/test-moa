import { expect, test } from "@playwright/test";
import { cancelAvailability, type ParticipationItem, type ParticipationStatus } from "@/features/participation/types";

const NOW = new Date("2026-11-20T12:00:00+09:00");
const BEFORE = "2026-11-25T23:59:59+09:00";
const PASSED = "2026-11-18T23:59:59+09:00";

/** 모집 마감이 recruitDeadline인 참여 */
function item(status: ParticipationStatus, recruitDeadline: string, extra: Partial<ParticipationItem> = {}): ParticipationItem {
  return {
    key: "p-1",
    recruitmentSlug: "booklog",
    status,
    appliedAt: "2026-11-15T10:00:00+09:00",
    earnedCredits: 0,
    testItems: [],
    feedbacks: [],
    recruitment: {
      slug: "booklog",
      projectName: "북로그",
      summary: "",
      request: "북로그 1차 테스트",
      softwareTypes: [],
      isSubscription: false,
      createdAt: "",
      recruitDeadline,
      submitDeadline: "2026-12-02T23:59:59+09:00",
      confirmedCount: 0,
      baseReward: 1000,
    },
    ...extra,
  };
}

test("#286-S7 선정 대기·제출 전 참가는 모집 마감 전에 취소할 수 있다", () => {
  expect(cancelAvailability(item("selectionPending", BEFORE), NOW)).toEqual({ cancellable: true });
  expect(cancelAvailability(item("beforeSubmit", BEFORE), NOW)).toEqual({ cancellable: true });
});

test("#286-S8 테스트가 시작된 제출 전 참가는 버튼 대신 이유를 보인다", () => {
  expect(cancelAvailability(item("beforeSubmit", PASSED), NOW)).toEqual({
    cancellable: false,
    reason: "테스트가 시작돼 지원을 취소할 수 없어요",
  });
});

test("#286-S8 피드백을 냈거나 끝났거나 모집이 취소된 참가는 안내 없이 숨긴다", () => {
  for (const status of ["notSelected", "payoutPending", "underReview", "paid", "incomplete", "excluded", "cancelled"] as const) {
    expect(cancelAvailability(item(status, BEFORE), NOW)).toEqual({ cancellable: false });
  }
  expect(cancelAvailability(item("selectionPending", PASSED), NOW)).toEqual({ cancellable: false });
  expect(cancelAvailability(item("beforeSubmit", BEFORE, { recruitmentCancelled: true }), NOW)).toEqual({ cancellable: false });
});
