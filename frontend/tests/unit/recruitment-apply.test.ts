import { expect, test } from "@playwright/test";
import { getApplyBlockedMessage } from "@/features/recruitment/types";

test("#188-S9 모집 중이고 참가가 없거나 참여 취소만 있으면 지원할 수 있다", () => {
  expect(getApplyBlockedMessage("recruiting", null)).toBeNull();
  expect(getApplyBlockedMessage("recruiting", undefined)).toBeNull();
  expect(getApplyBlockedMessage("recruiting", "cancelled")).toBeNull();
});

test("#188-S9 대기·확정·거절 참가가 있으면 다시 지원할 수 없다", () => {
  for (const status of ["applied", "confirmed", "rejected"] as const) {
    expect(getApplyBlockedMessage("recruiting", status)).toBe("이미 지원한 테스트예요");
  }
});

test("#188-S9 모집 중이 아니면 마감으로 막는다", () => {
  for (const status of ["testing", "closed", "cancelled"] as const) {
    expect(getApplyBlockedMessage(status, null)).toBe("모집이 마감됐어요");
  }
});
