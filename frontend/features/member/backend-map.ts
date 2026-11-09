import type { AdminSanction, UserDetail, UserSummary } from "@/features/member/admin";
import type { Restriction, SanctionType } from "@/features/member/types";
import type { BackendReportStatus, BackendReportTarget, Report } from "@/features/report/types";
import { BACKEND_REPORT_TARGET_LABEL } from "@/features/report/types";

/*
 * 백엔드 운영자 회원 응답(#86)을 화면의 UserSummary·UserDetail 모양으로 바꾼다.
 * 백엔드는 실명·이메일을 가려서 주므로 realName·email에 가린 값이 들어간다(화면에서 한 번 더 가려도 같다).
 * 백엔드에는 활동 집계가 아직 없어서 activity는 비어 있다.
 */

type Member = { id: number; nickname: string } | null;

type BackendSanction = {
  id: number;
  type: SanctionType;
  restrictions: Restriction[];
  reason: string;
  startedAt: string;
  endsAt: string | null;
  releasedAt: string | null;
  releaseReason: string | null;
  active: boolean;
  sanctionedBy: Member;
};

type BackendReport = { id: number; targetType: BackendReportTarget; status: BackendReportStatus; reason: string; createdAt: string; reviewedAt: string | null };

/** GET /api/v1/admin/users(목록·상세) 한 건. 목록에는 maskedName·maskedEmail·sanctions·receivedReports가 null */
export type AdminUserResponse = {
  id: number;
  nickname: string;
  joinedAt: string;
  maskedName: string | null;
  maskedEmail: string | null;
  sanctionCount: number;
  pendingReportCount: number;
  sanctions: BackendSanction[] | null;
  receivedReports: BackendReport[] | null;
};

const NO_ACTIVITY = { tester: null, developer: null };

export function toUserSummary(user: AdminUserResponse): UserSummary {
  return {
    id: String(user.id),
    nickname: user.nickname,
    realName: user.maskedName ?? "",
    email: user.maskedEmail ?? "",
    joinedAt: user.joinedAt,
    activity: NO_ACTIVITY,
    sanctionCount: user.sanctionCount,
    pendingReportCount: user.pendingReportCount,
  };
}

function toSanction(sanction: BackendSanction): AdminSanction {
  return { ...sanction, id: String(sanction.id), sanctionedBy: sanction.sanctionedBy?.nickname ?? null };
}

function toReceived(user: AdminUserResponse, report: BackendReport): Report {
  return {
    id: String(report.id),
    targetType: report.targetType === "FEEDBACK" ? "feedback" : report.targetType === "RECRUITMENT" ? "recruitment" : "user",
    recruitmentName: `${BACKEND_REPORT_TARGET_LABEL[report.targetType]} 신고`,
    recruitmentSlug: "",
    reason: report.reason,
    reporterNickname: "",
    targetNickname: user.nickname,
    targetUserKey: String(user.id),
    createdAt: report.createdAt,
    holdsReward: report.targetType === "FEEDBACK",
    review: report.status === "PENDING" || !report.reviewedAt ? undefined : {
      decision: report.status === "ACCEPTED" ? "upheld" : "dismissed",
      memo: "",
      processedAt: report.reviewedAt,
    },
  };
}

export function toUserDetail(user: AdminUserResponse): UserDetail {
  return {
    ...toUserSummary(user),
    sanctions: [],
    receivedReports: (user.receivedReports ?? []).map((report) => toReceived(user, report)),
    adminSanctions: (user.sanctions ?? []).map(toSanction),
  };
}
