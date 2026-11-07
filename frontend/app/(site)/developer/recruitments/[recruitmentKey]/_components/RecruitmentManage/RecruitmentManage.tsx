import Link from "next/link";
import { PROJECTS_PATH, projectPath } from "@/features/project/paths";
import { Badge } from "@/components/ui/Badge/Badge";
import { SOFTWARE_TYPE_LABEL } from "@/features/recruitment/types";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { RecruitmentAnalytics, RecruitmentView } from "@/features/recruitment/types";
import {
  SELECTION_MODE_LABEL,
  type RecruitmentCancellation,
  type RecruitmentDetail,
} from "@/features/recruitment/types";
import { type Project } from "@/features/project/types";
import { CancelRecruitmentButton } from "../CancelRecruitmentButton/CancelRecruitmentButton";
import { ExternalLink } from "../../../../_components/ProjectDetail/ProjectDetail";
import { RecruitmentStatusBadge } from "@/features/recruitment/components/RecruitmentStatusBadge/RecruitmentStatusBadge";
import { TestItemImages } from "@/features/recruitment/components/TestItemImages/TestItemImages";
import { Card } from "@/components/ui/Card/Card";
import styles from "./RecruitmentManage.module.css";

/* 테스트 모집 관리 화면의 머리 요약, 탭 줄, 분석 탭 */

export const MANAGE_TABS = [
  { value: "testers", label: "테스터 관리" },
  { value: "feedback", label: "피드백" },
  { value: "analytics", label: "분석" },
] as const;

export type ManageTab = (typeof MANAGE_TABS)[number]["value"];

/** URL의 tab 값을 읽는다. 없거나 모르는 값이면 테스터 관리 */
export function parseManageTab(value: string | string[] | undefined): ManageTab {
  return MANAGE_TABS.find((tab) => tab.value === value)?.value ?? "testers";
}

type SummaryProps = {
  project: Project;
  recruitment: RecruitmentView;
  analytics: RecruitmentAnalytics;
  detail: RecruitmentDetail;
  cancellation: RecruitmentCancellation | null;
  canCancel: boolean;
};

/** 모집 건 요약. 탭 위에 늘 보인다 */
export function RecruitmentSummary({ project, recruitment, analytics, detail, cancellation, canCancel }: SummaryProps) {
  const beforeTest = recruitment.status === "recruiting";
  const facts = [
    ["확정 인원", `${recruitment.confirmedCount}명`],
    ["지원", `${analytics.applicationCount}명`],
    ["피드백 제출", `${analytics.feedbackCount}건`],
    ["모집 마감", formatDate(recruitment.recruitDeadline)],
    ["제출 마감", formatDate(recruitment.submitDeadline)],
    ["유형", SOFTWARE_TYPE_LABEL[recruitment.softwareType]],
    ["선정 방식", SELECTION_MODE_LABEL[detail.selectionMode]],
  ];
  return (
    <div className={styles.recruitmentSummary}>
      {/* 할 일에서 바로 들어와도 목록까지 한 번에 돌아갈 수 있게 경로를 보여 준다 */}
      <nav aria-label="현재 위치">
        <ol className={styles.recruitmentSummaryList}>
          <li>
            <Link href={PROJECTS_PATH} className={styles.recruitmentSummaryLink}>
              내 프로젝트
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href={projectPath(project.key)} className={styles.recruitmentSummaryName}>
              {project.name}
            </Link>
          </li>
        </ol>
      </nav>
      <div className={styles.recruitmentSummaryBox}>
        <RecruitmentStatusBadge status={recruitment.status} />
        {recruitment.isSubscription && <Badge tone="muted">구독 모집</Badge>}
        {canCancel && (
          <span className={styles.recruitmentSummaryLabel}>
            <CancelRecruitmentButton recruitmentKey={recruitment.slug} reasonRequired={recruitment.status === "testing"} />
          </span>
        )}
        {beforeTest && !canCancel && <span className={styles.recruitmentSummaryLabel2}>확정된 테스터가 있어 취소할 수 없어요</span>}
      </div>
      <h1 className={styles.recruitmentSummaryTitle}>{detail.title || recruitment.request}</h1>
      {detail.title && <p className={styles.recruitmentSummaryRequest}>{recruitment.request}</p>}
      {detail.accessUrl && <ExternalLink href={detail.accessUrl}>{detail.accessUrl}</ExternalLink>}
      <Card as="dl" className={styles.recruitmentSummaryList2}>
        {facts.map(([term, value]) => (
          <div key={term} className={styles.recruitmentSummary2}>
            <dt className={styles.recruitmentSummaryTerm}>{term}</dt>
            <dd className={styles.recruitmentSummaryValue}>{value}</dd>
          </div>
        ))}
      </Card>
      {cancellation && <CancelStatus cancellation={cancellation} feedbackCount={analytics.feedbackCount} />}
      <RecruitmentDetailBox detail={detail} />
    </div>
  );
}

/** 취소한 모집 안내. 피드백이 있으면 그 보상은 유지된다고 알린다 */
function CancelStatus({ cancellation, feedbackCount }: { cancellation: RecruitmentCancellation; feedbackCount: number }) {
  return (
    <Card as="div" data-testid="cancel-status" className={styles.cancelStatus}>
      <p className={styles.cancelStatusText}>
        {feedbackCount > 0
          ? "모집을 취소했어요. 피드백을 내지 않은 테스터의 참여는 취소됐고, 이미 낸 피드백의 보상은 그대로 지급돼요"
          : "모집을 취소했어요. 지원자와 테스터의 참여도 함께 취소됐어요"}
      </p>
      <p className={styles.cancelStatusText2}>
        {cancellation.reason && `취소 사유: ${cancellation.reason} · `}
        {formatDate(cancellation.cancelledAt)} 취소
      </p>
    </Card>
  );
}

/** 모집 조건과 테스트 항목. 길어질 수 있어 접어 두고 필요할 때 연다 */
function RecruitmentDetailBox({ detail }: { detail: RecruitmentDetail }) {
  return (
    <Card as="details" className={styles.recruitmentDetailBox}>
      <summary className={styles.recruitmentDetailBoxSummary}>모집 조건과 테스트 항목 {detail.testItems.length}개</summary>
      <div className={styles.recruitmentDetailBoxBox}>
        <div className={styles.recruitmentDetailBoxBox2}>
          <p className={styles.recruitmentDetailBoxText}>모집 조건</p>
          <p className={styles.recruitmentDetailBoxText2}>{detail.conditions || "따로 정한 조건이 없어요"}</p>
        </div>
        <div className={styles.recruitmentDetailBoxBox3}>
          <p className={styles.recruitmentDetailBoxText3}>테스트 항목</p>
          <ol className={styles.recruitmentDetailBoxList}>
            {detail.testItems.map((item) => (
              <li key={item.id}>
                <span className={styles.recruitmentDetailBoxTitle}>{item.title}</span>
                <Badge tone={item.required ? "neutral" : "outline"} className={styles.recruitmentDetailBoxBadge}>
                  {item.required ? "필수" : "선택"}
                </Badge>
                {item.description && <span className={styles.recruitmentDetailBoxLabel}> · {item.description}</span>}
                <div className={styles.recruitmentDetailBoxBox4}>
                  <TestItemImages item={item} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Card>
  );
}

/** 탭 줄. 탭 상태는 URL의 tab에만 둔다 */
export function RecruitmentTabs({ basePath, current }: { basePath: string; current: ManageTab }) {
  return (
    <nav aria-label="모집 관리 탭" className={styles.recruitmentTabs}>
      <ul className={styles.recruitmentTabsList}>
        {MANAGE_TABS.map((tab) => {
          const active = tab.value === current;
          return (
            <li key={tab.value}>
              <Link
                href={`${basePath}?tab=${tab.value}`}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(styles.recruitmentTabsLabel, active ? styles.recruitmentTabsLabelActive : styles.recruitmentTabsLabelNotActive)}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** 분석 탭. 구독 모집에서만 숫자를 보여 준다 */
export function AnalyticsPanel({ isSubscription, analytics }: { isSubscription: boolean; analytics: RecruitmentAnalytics }) {
  if (!isSubscription) {
    return (
      <Card as="div" className={styles.analyticsPanel}>
        <p className={styles.analyticsPanelText}>구독 모집에서 분석을 볼 수 있어요</p>
        <p className={styles.analyticsPanelText2}>구독하면 지원·제출·신고 흐름을 숫자로 확인할 수 있어요.</p>
        <LinkButton href="/my/subscription" className={styles.analyticsPanelButton}>
          구독 알아보기
        </LinkButton>
      </Card>
    );
  }
  const tiles = [
    ["지원 수", `${analytics.applicationCount}명`],
    ["확정 수", `${analytics.confirmedCount}명`],
    ["피드백 제출 수", `${analytics.feedbackCount}건`],
    ["제출률", `${analytics.submitRate}%`],
    ["신고 수", `${analytics.reportCount}건`],
  ];
  return (
    <dl className={styles.analyticsPanel2}>
      {tiles.map(([term, value]) => (
        <Card as="div" key={term} className={styles.analyticsPanel3}>
          <dt className={styles.analyticsPanelTerm}>{term}</dt>
          <dd className={styles.analyticsPanelValue}>{value}</dd>
        </Card>
      ))}
    </dl>
  );
}
