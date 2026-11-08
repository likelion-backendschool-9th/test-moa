import { ArrowLeftIcon, ArrowUpRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { projectPath } from "@/features/project/paths";
import { Badge } from "@/components/ui/Badge/Badge";
import { SOFTWARE_TYPE_LABEL } from "@/features/recruitment/types";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { RecruitmentAnalytics, RecruitmentView } from "@/features/recruitment/types";
import {
  SELECTION_MODE_LABEL,
  type SelectionMode,
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

/* 테스트 모집 관리 화면의 머리, 탭 줄, 모집 정보 탭, 분석 탭 */

export const MANAGE_TABS = [
  { value: "info", label: "모집 정보", pro: false },
  { value: "testers", label: "테스터 관리", pro: false },
  { value: "feedback", label: "피드백", pro: false },
  { value: "analytics", label: "리뷰 분석", pro: true },
  /* 아직 만들지 않아 준비 중으로 보여 준다 */
  { value: "versions", label: "버전 별 분석", pro: true },
] as const;

export type ManageTab = (typeof MANAGE_TABS)[number]["value"];

/** URL의 tab 값을 읽는다. 없거나 모르는 값이면 모집 정보 */
export function parseManageTab(value: string | string[] | undefined): ManageTab {
  return MANAGE_TABS.find((tab) => tab.value === value)?.value ?? "info";
}

/* "북로그로", "할 일 메모로", "새 서비스앱으로". 받침이 있으면(ㄹ 받침 제외) "으로" */
function withRo(name: string) {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  const final = code >= 0 && code < 11172 ? code % 28 : 0;
  return final === 0 || final === 8 ? "로" : "으로";
}

/** 모집 건 머리. 탭 위에 늘 보인다 */
export function RecruitmentHeader({
  project,
  recruitment,
  feedbackCount,
  selectionMode,
}: {
  project: Project;
  recruitment: RecruitmentView & { version: number };
  feedbackCount: number;
  selectionMode: SelectionMode;
}) {
  return (
    <div className={styles.header}>
      <Link href={projectPath(project.key)} className={styles.backLink}>
        <ArrowLeftIcon aria-hidden size={16} weight="bold" />
        {project.name}
        {withRo(project.name)} 돌아가기
      </Link>
      <div className={styles.headerMain}>
        <div className={styles.headerText}>
          <div className={styles.headerBadges}>
            <Badge tone="muted">v{recruitment.version}</Badge>
            <RecruitmentStatusBadge status={recruitment.status} />
            {recruitment.isSubscription && <Badge tone="muted">구독 모집</Badge>}
          </div>
          <h1 className={styles.headerTitle}>{recruitment.title || recruitment.request}</h1>
          <p className={styles.headerMeta}>
            확정 {recruitment.confirmedCount}명 · 피드백 {feedbackCount}건 · {SELECTION_MODE_LABEL[selectionMode]}
          </p>
        </div>
        {/* 취소된 모집은 공개 페이지가 없다 */}
        {recruitment.status !== "cancelled" && (
          <LinkButton href={`/recruitments/${recruitment.slug}`} variant="ghost" size="sm" className={styles.publicButton}>
            <ArrowUpRightIcon aria-hidden size={14} weight="bold" />
            공개 페이지
          </LinkButton>
        )}
      </div>
    </div>
  );
}

type InfoProps = {
  recruitment: RecruitmentView;
  analytics: RecruitmentAnalytics;
  detail: RecruitmentDetail;
  cancellation: RecruitmentCancellation | null;
  canCancel: boolean;
};

/** 모집 정보 탭: 요청 내용, 접속 링크, 숫자 요약, 모집 조건과 테스트 항목, 모집 취소 */
export function RecruitmentInfoPanel({ recruitment, analytics, detail, cancellation, canCancel }: InfoProps) {
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
    <div className={styles.infoPanel}>
      {cancellation && <CancelStatus cancellation={cancellation} feedbackCount={analytics.feedbackCount} />}
      {detail.title && <p className={styles.infoRequest}>{recruitment.request}</p>}
      {detail.accessUrl && <ExternalLink href={detail.accessUrl}>{detail.accessUrl}</ExternalLink>}
      <Card as="dl" className={styles.recruitmentSummaryList2}>
        {facts.map(([term, value]) => (
          <div key={term} className={styles.recruitmentSummary2}>
            <dt className={styles.recruitmentSummaryTerm}>{term}</dt>
            <dd className={styles.recruitmentSummaryValue}>{value}</dd>
          </div>
        ))}
      </Card>
      <RecruitmentDetailBox detail={detail} />
      {/* 되돌리기 어려운 행동이라 맨 아래에 둔다 */}
      {canCancel && (
        <div className={styles.infoCancel}>
          <CancelRecruitmentButton recruitmentKey={recruitment.slug} reasonRequired={recruitment.status === "testing"} />
        </div>
      )}
      {beforeTest && !canCancel && <p className={styles.infoCancelNote}>확정된 테스터가 있어 취소할 수 없어요</p>}
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

/** 탭 줄. 탭 상태는 URL의 tab에만 둔다. 피드백 탭에는 피드백 수, 유료 기능 탭에는 PRO를 붙인다 */
export function RecruitmentTabs({ basePath, current, feedbackCount }: { basePath: string; current: ManageTab; feedbackCount: number }) {
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
                {tab.value === "feedback" && <span className={styles.tabCount}>{feedbackCount}</span>}
                {tab.pro && <span className={styles.proMark}>PRO</span>}
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
