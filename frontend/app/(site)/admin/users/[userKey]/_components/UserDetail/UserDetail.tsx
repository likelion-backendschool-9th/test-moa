import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge/Badge";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { REPORT_DECISION_LABEL, type Report } from "@/features/report/types";
import { maskEmail, maskName, type UserActivity, type UserDetail } from "@/features/member/admin";
import { AdminPanel } from "@/app/(site)/admin/_components/AdminPanel/AdminPanel";
import { SanctionPanel } from "@/app/(site)/admin/users/[userKey]/_components/SanctionPanel/SanctionPanel";
import styles from "./UserDetail.module.css";


/** 회원 상세. 실명·이메일은 가려서 보여 준다. 목업은 제재 이력만, 실제 로그인은 제재·해제 양식도 보여 준다(docs/frontend/admin/users.md) */
export function UserDetailView({ user, notice }: { user: UserDetail; notice?: string }) {
  const backend = user.adminSanctions;
  return (
    <div className={styles.userDetailView}>
      <Link href="/admin/users" className={styles.userDetailViewLink}>
        목록으로
      </Link>
      <div className={styles.userDetailViewBox}>
        {(backend ?? user.sanctions).length > 0 && (
          <div className={styles.userDetailViewBox2}>
            <Badge tone="neutral">제재 이력 {(backend ?? user.sanctions).length}건</Badge>
          </div>
        )}
        <h2 className={styles.userDetailViewNickname}>{user.nickname}</h2>
      </div>

      <Panel id="user-info-heading" title="기본 정보">
        <dl className={styles.infoGrid}>
          <Info label="닉네임">{user.nickname}</Info>
          <Info label="가입">{formatDate(user.joinedAt)}</Info>
          <Info label="실명">{maskName(user.realName)}</Info>
          <Info label="이메일">{maskEmail(user.email)}</Info>
        </dl>
      </Panel>

      {/* 실제 로그인: 백엔드에 활동 집계가 아직 없어서 활동은 숨기고, 제재는 제재·해제 양식과 함께 보여 준다 */}
      {backend ? (
        <SanctionPanel userKey={user.id} sanctions={backend} notice={notice} />
      ) : (
        <>
          <Panel id="user-activity-heading" title="활동">
            <ActivitySummary activity={user.activity} />
          </Panel>

          <Panel id="user-sanctions-heading" title="제재 이력">
            {user.sanctions.length === 0 ? (
              <p className={styles.userDetailViewText}>제재 이력이 없어요</p>
            ) : (
              <ReportRows reports={user.sanctions} dateOf={(report) => report.review!.processedAt} dateLabel="처리" />
            )}
          </Panel>
        </>
      )}

      <Panel id="user-reports-heading" title="받은 신고">
        {user.receivedReports.length === 0 ? (
          <p className={styles.userDetailViewText2}>받은 신고가 없어요</p>
        ) : (
          <ReportRows reports={user.receivedReports} dateOf={(report) => report.createdAt} dateLabel="접수" showStatus />
        )}
      </Panel>
    </div>
  );
}

function Panel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <AdminPanel as="section" aria-labelledby={id}>
      <h3 id={id} className={styles.panelTitle}>
        {title}
      </h3>
      {children}
    </AdminPanel>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className={styles.infoLabel}>{label}</dt>
      <dd className={styles.infoChildren}>{children}</dd>
    </>
  );
}

/** 테스터 활동과 개발자 활동을 모두 보여 준다. 해 본 적이 없는 쪽은 없다고 적는다 */
function ActivitySummary({ activity }: { activity: UserActivity }) {
  const { tester, developer } = activity;
  return (
    <div className={styles.activitySummary}>
      <ActivityGroup title="테스터 활동" emptyText="테스터 활동이 없어요" hasActivity={tester !== null}>
        {tester && (
          <>
            <Info label="참여 확정">{tester.confirmedCount}회</Info>
            <Info label="피드백 제출">{tester.submittedCount}회</Info>
            <Info label="미완료">{tester.incompleteCount}회</Info>
          </>
        )}
      </ActivityGroup>
      <ActivityGroup title="개발자 활동" emptyText="개발자 활동이 없어요" hasActivity={developer !== null}>
        {developer && (
          <>
            <Info label="프로젝트">{developer.projectCount}개</Info>
            <Info label="모집 건">{developer.recruitmentCount}개</Info>
            <Info label="구독">{developer.subscribed ? "구독 중" : "구독 안 함"}</Info>
          </>
        )}
      </ActivityGroup>
    </div>
  );
}

type ActivityGroupProps = { title: string; emptyText: string; hasActivity: boolean; children: ReactNode };

function ActivityGroup({ title, emptyText, hasActivity, children }: ActivityGroupProps) {
  return (
    <div className={styles.activityGroup}>
      <h4 className={styles.activityGroupTitle}>{title}</h4>
      {hasActivity ? <dl className={styles.infoGrid}>{children}</dl> : <p className={styles.activityGroupEmptyText}>{emptyText}</p>}
    </div>
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
    <ul className={styles.reportRows}>
      {reports.map((report) => (
        <li key={report.id}>
          <Link
            href={`/admin/reports/${report.id}`}
            className={cn(styles.reportRowsLink, styles.reportRowsLinkExtra)}
          >
            <span className={styles.reportRowsLabel}>
              <span className={styles.reportRowsRecruitmentName}>{report.recruitmentName}</span>
              <span className={styles.reportRowsReason}>{report.reason}</span>
            </span>
            <span className={styles.reportRowsLabel2}>
              {showStatus && (
                <Badge tone="neutral">{report.review ? REPORT_DECISION_LABEL[report.review.decision] : "검토 대기"}</Badge>
              )}
              <span className={styles.reportRowsLabel3}>
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
    <div aria-busy="true" aria-label="회원 정보 불러오는 중" className={styles.userDetailSkeleton}>
      <Skeleton className={styles.userDetailSkeletonSkeleton} />
      <Skeleton className={styles.userDetailSkeletonSkeleton2} />
      <AdminPanel data-skeleton="user-detail">
        <Skeleton className={styles.userDetailSkeletonSkeleton3} />
        <Skeleton className={styles.userDetailSkeletonSkeleton4} />
      </AdminPanel>
    </div>
  );
}
