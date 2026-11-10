import type { Application, ApplicationStatus, Feedback, FeedbackStatus } from "@/features/recruitment/types";

/** 백엔드 ApplicantResponse */
export type ApplicantResponse = {
  registerId: number;
  nickname: string;
  status: ApplicationStatus;
  appliedAt: string;
  feedbackSubmitted: boolean;
};

/** 백엔드 FeedbackResponse. status는 submitted, reported, rewarded, excluded */
export type DeveloperFeedbackResponse = {
  feedbackId: number;
  registerId: number;
  nickname: string;
  testItemId: number | null;
  content: string;
  imageUrls: string[];
  submittedAt: string;
  status: string;
  recommended: boolean;
};

/* 보상 제외(excluded)는 신고가 인정된 결과라 화면에서는 신고됨으로 보여 준다. 화면 상태에 따로 두지 않는다 */
const FEEDBACK_STATUS: Record<string, FeedbackStatus> = {
  submitted: "waiting",
  reported: "reported",
  excluded: "reported",
  rewarded: "paid",
};

export function toApplication(item: ApplicantResponse): Application {
  return { id: String(item.registerId), registerId: String(item.registerId), testerNickname: item.nickname, status: item.status, appliedAt: item.appliedAt };
}

export function toFeedback(item: DeveloperFeedbackResponse): Feedback {
  return {
    id: String(item.feedbackId),
    registerId: String(item.registerId),
    testerNickname: item.nickname,
    testItemId: item.testItemId === null ? null : String(item.testItemId),
    images: item.imageUrls.map((url, index) => ({ url, name: `${item.nickname}님의 피드백 이미지 ${index + 1}` })),
    recommended: item.recommended,
    content: item.content,
    submittedAt: item.submittedAt,
    status: FEEDBACK_STATUS[item.status] ?? "waiting",
  };
}
