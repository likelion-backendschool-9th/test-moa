import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { formatElapsed } from "@/lib/format";
import { LinkTabs } from "../../_components/LinkTabs";
import { isOverdue, REPORT_DECISION_LABEL, REPORT_TARGET_LABEL, type Report, type ReportDecision } from "@/features/report/types";
import { reportDetailHref, reportsHref, type ReportTargetFilter, type ListTab } from "@/features/report/paths";

const TABS: { tab: ListTab; label: string }[] = [
  { tab: "pending", label: "검토 대기" },
  { tab: "done", label: "처리 완료" },
];

const TARGET_FILTERS: { target: ReportTargetFilter; label: string }[] = [
  { target: "all", label: "전체" },
  { target: "feedback", label: REPORT_TARGET_LABEL.feedback },
  { target: "recruitment", label: REPORT_TARGET_LABEL.recruitment },
  { target: "user", label: REPORT_TARGET_LABEL.user },
];

/** 검토 대기·처리 완료 탭. 고른 대상 필터는 남긴다 */
export function ReportTabs({ current, target }: { current: ListTab; target: ReportTargetFilter }) {
  const tabs = TABS.map((item) => ({ ...item, href: reportsHref({ tab: item.tab, target }) }));
  return <LinkTabs label="신고 상태" tabs={tabs} current={current} />;
}

/** 신고 대상 종류 필터(전체·피드백·모집 글·회원). 고른 상태 탭은 남긴다 */
export function ReportTargetFilters({ tab, current }: { tab: ListTab; current: ReportTargetFilter }) {
  const tabs = TARGET_FILTERS.map((item) => ({ tab: item.target, label: item.label, href: reportsHref({ tab, target: item.target }) }));
  return <LinkTabs label="신고 대상" tabs={tabs} current={current} />;
}

function processedMessage(decision: ReportDecision, held: boolean) {
  if (decision === "upheld") return "신고를 인정했어요. 제재 이력에 반영돼요.";
  return held ? "신고를 기각했어요. 보류된 보상이 지급돼요." : "신고를 기각했어요.";
}

/** 처리 직후 목록에서 한 번 보여 주는 결과 문구. 보상 보류가 없던 신고는 지급 문구를 뺀다 */
export function ProcessedNotice({ decision, held }: { decision: ReportDecision; held: boolean }) {
  return (
    <p role="status" className="rounded-2xl bg-surface-muted px-6 py-4 text-sm font-semibold">
      {processedMessage(decision, held)}
    </p>
  );
}

const rowClass = "flex flex-col gap-2 rounded-2xl bg-surface-muted p-5 md:flex-row md:items-center md:gap-4 md:p-6";

/** 신고 목록. 피드백 원문은 상세에서만 보여 준다 */
export function ReportList({
  reports,
  tab,
  target,
  now,
}: {
  reports: Report[];
  tab: ListTab;
  target: ReportTargetFilter;
  now: Date;
}) {
  if (reports.length === 0) {
    const base = tab === "pending" ? "검토할 신고가 없어요" : "처리한 신고가 없어요";
    /* 어떤 필터 때문인지 알 수 있게 대상 종류를 따옴표로 말한다 */
    return <EmptyState title={target === "all" ? base : `'${REPORT_TARGET_LABEL[target]}' 신고 중에는 ${base}`} />;
  }
  return (
    <ul aria-label={tab === "pending" ? "검토 대기 신고" : "처리 완료 신고"} className="flex flex-col gap-3">
      {reports.map((report) => (
        <li key={report.id}>
          <Link
            href={reportDetailHref(report.id, { tab, target })}
            className={cn(rowClass, "transition-colors duration-300 ease-brand hover:bg-surface-strong")}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="muted">{REPORT_TARGET_LABEL[report.targetType]}</Badge>
                <span className="font-semibold">{report.recruitmentName}</span>
              </div>
              <span className="truncate text-sm text-text-muted">{report.reason}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {report.review ? (
                <>
                  <Badge tone="neutral">{REPORT_DECISION_LABEL[report.review.decision]}</Badge>
                  <span className="text-xs text-text-muted tabular-nums">처리 {formatElapsed(report.review.processedAt, now)}</span>
                </>
              ) : (
                <>
                  {report.holdsReward && <Badge tone="muted">보상 보류</Badge>}
                  {isOverdue(report, now) && <Badge tone="neutral">72시간 지남</Badge>}
                  <span className="text-xs text-text-muted tabular-nums">접수 {formatElapsed(report.createdAt, now)}</span>
                </>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ReportListSkeleton() {
  return (
    <div aria-busy="true" aria-label="신고 목록 불러오는 중" className="flex flex-col gap-3">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className={rowClass} data-skeleton="report">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-6 w-28" />
        </div>
      ))}
    </div>
  );
}
