import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { REPORT_DECISION_LABEL, type Report } from "../types";
import { maskEmail, maskName, USER_ROLE_LABEL, type UserActivity, type UserDetail } from "../users";

const panelClass = "flex flex-col gap-4 rounded-2xl bg-surface-muted p-6 md:p-8";
const infoGridClass = "grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]";

/** 회원 상세. 실명·이메일은 가려서 보여 준다. 제재는 이번에는 이력만 보여 준다(docs/frontend-admin-users.md) */
export function UserDetailView({ user }: { user: UserDetail }) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/users" className="self-start text-sm font-semibold text-text-muted hover:text-text">
        목록으로
      </Link>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="muted">{USER_ROLE_LABEL[user.activity.role]}</Badge>
          {user.sanctions.length > 0 && <Badge tone="neutral">제재 이력 {user.sanctions.length}건</Badge>}
        </div>
        <h2 className="text-2xl font-extrabold tracking-[-0.03em]">{user.nickname}</h2>
      </div>

      <Panel id="user-info-heading" title="기본 정보">
        <dl className={infoGridClass}>
          <Info label="닉네임">{user.nickname}</Info>
          <Info label="역할">{USER_ROLE_LABEL[user.activity.role]}</Info>
          <Info label="가입">{formatDate(user.joinedAt)}</Info>
          <Info label="실명">{maskName(user.realName)}</Info>
          <Info label="이메일">{maskEmail(user.email)}</Info>
        </dl>
      </Panel>

      <Panel id="user-activity-heading" title="활동">
        <ActivitySummary activity={user.activity} />
      </Panel>

      <Panel id="user-sanctions-heading" title="제재 이력">
        {user.sanctions.length === 0 ? (
          <p className="text-sm text-text-muted">제재 이력이 없어요</p>
        ) : (
          <ReportRows reports={user.sanctions} dateOf={(report) => report.review!.processedAt} dateLabel="처리" />
        )}
      </Panel>

      <Panel id="user-reports-heading" title="받은 신고">
        {user.receivedReports.length === 0 ? (
          <p className="text-sm text-text-muted">받은 신고가 없어요</p>
        ) : (
          <ReportRows reports={user.receivedReports} dateOf={(report) => report.createdAt} dateLabel="접수" showStatus />
        )}
      </Panel>
    </div>
  );
}

function Panel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={panelClass}>
      <h3 id={id} className="text-lg font-extrabold">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </>
  );
}

/** 테스터는 참여 기록을, 개발자는 프로젝트·구독을 보여 준다 */
function ActivitySummary({ activity }: { activity: UserActivity }) {
  return (
    <dl className={infoGridClass}>
      {activity.role === "tester" ? (
        <>
          <Info label="참여 확정">{activity.confirmedCount}회</Info>
          <Info label="피드백 제출">{activity.submittedCount}회</Info>
          <Info label="미완료">{activity.incompleteCount}회</Info>
        </>
      ) : (
        <>
          <Info label="프로젝트">{activity.projectCount}개</Info>
          <Info label="모집 건">{activity.recruitmentCount}개</Info>
          <Info label="구독">{activity.subscribed ? "구독 중" : "구독 안 함"}</Info>
        </>
      )}
    </dl>
  );
}

type ReportRowsProps = {
  reports: Report[];
  dateOf: (report: Report) => string;
  dateLabel: string;
  /** 받은 신고에서만 검토 대기·기각·인정을 보여 준다 */
  showStatus?: boolean;
};

/** 신고 줄. 누르면 신고 상세로 가서 원문과 처리 내용을 본다 */
function ReportRows({ reports, dateOf, dateLabel, showStatus = false }: ReportRowsProps) {
  return (
    <ul className="flex flex-col gap-2">
      {reports.map((report) => (
        <li key={report.id}>
          <Link
            href={`/admin/reports/${report.id}`}
            className={cn(
              "flex flex-col gap-1 rounded-xl bg-surface-strong px-4 py-3 transition-colors duration-300 ease-brand hover:bg-line",
              "sm:flex-row sm:items-center sm:gap-4",
            )}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-sm font-semibold">{report.recruitmentName}</span>
              <span className="text-sm text-text-muted">{report.reason}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              {showStatus && (
                <Badge tone="neutral">{report.review ? REPORT_DECISION_LABEL[report.review.decision] : "검토 대기"}</Badge>
              )}
              <span className="text-xs text-text-muted tabular-nums">
                {dateLabel} {formatDate(dateOf(report))}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function UserDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="회원 정보 불러오는 중" className="flex flex-col gap-6">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-8 w-40" />
      <div className={panelClass} data-skeleton="user-detail">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
