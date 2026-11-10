import type { BackendReportStatus, BackendReportTarget, Report, ReportEvidence, ReportTarget } from "@/features/report/types";

/*
 * 백엔드 운영자 신고 응답(#85)을 화면의 Report 모양으로 바꾼다. 화면 코드는 목업과 같은 모양을 그대로 쓴다.
 * 백엔드에는 처리 메모가 없어서 memo는 빈 값이고, 채팅 신고는 화면 분류가 없어 회원 신고로 보인다.
 */

type Member = { id: number; nickname: string; maskedName: string };

/** GET /api/v1/admin/reports(목록·상세) 한 건 */
export type AdminReportResponse = {
  id: number;
  targetType: BackendReportTarget;
  targetId: number;
  target: { recruitmentTitle: string | null; feedbackContent: string | null; roomKey: string | null; nickname: string | null };
  reason: string;
  status: BackendReportStatus;
  createdAt: string;
  reviewedAt: string | null;
  reporter: Member;
  reportedUser: Member;
  reviewer: Member | null;
  evidences: ReportEvidence[] | null;
};

const TARGET: Record<BackendReportTarget, ReportTarget> = {
  FEEDBACK: "feedback",
  RECRUITMENT: "recruitment",
  USER: "user",
  CHAT: "user",
};

/** 화면의 대상 종류 필터를 백엔드 값으로. 전체면 null */
export function backendTarget(target: ReportTarget | "all"): BackendReportTarget | null {
  if (target === "feedback") return "FEEDBACK";
  if (target === "recruitment") return "RECRUITMENT";
  if (target === "user") return "USER";
  return null;
}

export function toReport(report: AdminReportResponse): Report {
  return {
    id: String(report.id),
    targetType: TARGET[report.targetType],
    /* 목록 제목: 모집 글은 모집 이름, 그 밖에는 신고당한 회원 닉네임 */
    recruitmentName: report.target.recruitmentTitle ?? report.reportedUser.nickname,
    /* 모집 글 신고만 모집 id를 안다. 다른 신고는 모집 글 바로가기를 숨긴다 */
    recruitmentSlug: report.targetType === "RECRUITMENT" ? String(report.targetId) : "",
    reason: report.reason,
    reporterNickname: report.reporter.nickname,
    targetNickname: report.reportedUser.nickname,
    targetUserKey: String(report.reportedUser.id),
    feedback: report.target.feedbackContent ?? undefined,
    createdAt: report.createdAt,
    holdsReward: report.targetType === "FEEDBACK",
    review: report.status === "PENDING" || !report.reviewedAt ? undefined : {
      decision: report.status === "ACCEPTED" ? "upheld" : "dismissed",
      memo: "",
      processedAt: report.reviewedAt,
    },
    evidences: report.evidences ?? [],
  };
}
