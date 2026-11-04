import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { SOFTWARE_TYPE_LABEL } from "@/features/recruitment/types";
import { LinkButton } from "@/components/ui/LinkButton";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { RecruitmentAnalytics, RecruitmentView } from "../service";
import { CANCEL_REQUEST_LABEL, SELECTION_MODE_LABEL, type CancelRequest, type Project, type RecruitmentDetail } from "../types";
import { CancelRequestButton } from "./CancelRequestButton";
import { ExternalLink } from "./ProjectDetail";
import { RecruitmentStatusBadge } from "./StatusBadge";
import { TestItemImages } from "./TestItemImages";

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
  cancelRequest: CancelRequest | null;
  canRequestCancel: boolean;
};

/** 모집 건 요약. 탭 위에 늘 보인다 */
export function RecruitmentSummary({ project, recruitment, analytics, detail, cancelRequest, canRequestCancel }: SummaryProps) {
  const facts = [
    ["확정 인원", `${recruitment.confirmedCount}명`],
    ["정원", `${recruitment.capacity}명`],
    ["지원", `${analytics.applicationCount}명`],
    ["피드백 제출", `${analytics.feedbackCount}건`],
    ["모집 마감", formatDate(recruitment.recruitDeadline)],
    ["제출 마감", formatDate(recruitment.submitDeadline)],
    ["유형", SOFTWARE_TYPE_LABEL[recruitment.softwareType]],
    ["선정 방식", SELECTION_MODE_LABEL[detail.selectionMode]],
  ];
  return (
    <div className="flex flex-col gap-4">
      {/* 할 일에서 바로 들어와도 목록까지 한 번에 돌아갈 수 있게 경로를 보여 준다 */}
      <nav aria-label="현재 위치">
        <ol className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text-muted">
          <li>
            <Link href="/my/projects" className="hover:text-text">
              내 프로젝트
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href={`/my/projects/${project.key}`} className="hover:text-text">
              {project.name}
            </Link>
          </li>
        </ol>
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        <RecruitmentStatusBadge status={recruitment.status} />
        {recruitment.isSubscription && <Badge tone="muted">구독 모집</Badge>}
        {canRequestCancel && (
          <span className="ml-auto">
            <CancelRequestButton projectKey={project.key} recruitmentKey={recruitment.slug} />
          </span>
        )}
      </div>
      <h1 className="text-3xl font-extrabold tracking-[-0.03em]">{detail.title || recruitment.request}</h1>
      {detail.title && <p className="text-lg text-text-muted">{recruitment.request}</p>}
      {detail.accessUrl && <ExternalLink href={detail.accessUrl}>{detail.accessUrl}</ExternalLink>}
      <dl className="grid grid-cols-2 gap-4 rounded-2xl bg-surface-muted p-5 sm:grid-cols-4 lg:grid-cols-8">
        {facts.map(([term, value]) => (
          <div key={term} className="flex flex-col gap-1">
            <dt className="text-xs text-text-muted">{term}</dt>
            <dd className="font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      {cancelRequest && <CancelStatus request={cancelRequest} />}
      <RecruitmentDetailBox detail={detail} />
    </div>
  );
}

/** 모집 취소 요청 상태. 반려면 운영자가 고른 사유를 보여 준다 */
function CancelStatus({ request }: { request: CancelRequest }) {
  const message = {
    pending: "모집 취소를 요청했어요. 운영자 확인을 기다리고 있어요",
    approved: "운영자가 모집 취소를 승인했어요. 확정된 테스터의 참여도 함께 취소됐어요",
    rejected: "모집 취소 요청이 반려됐어요. 모집은 그대로 진행돼요",
  }[request.status];
  return (
    <div data-testid="cancel-status" className="flex flex-col gap-1 rounded-2xl border border-line bg-surface-muted px-5 py-4 text-sm">
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        <Badge tone="muted">취소 요청 {CANCEL_REQUEST_LABEL[request.status]}</Badge>
        {message}
      </p>
      <p className="text-text-muted">
        요청 사유: {request.reason} · {formatDate(request.requestedAt)} 요청
      </p>
      {request.rejectReason && <p className="text-text-muted">반려 사유: {request.rejectReason}</p>}
    </div>
  );
}

/** 모집 조건과 테스트 항목. 길어질 수 있어 접어 두고 필요할 때 연다 */
function RecruitmentDetailBox({ detail }: { detail: RecruitmentDetail }) {
  return (
    <details className="rounded-2xl bg-surface-muted px-5 py-4">
      <summary className="cursor-pointer text-sm font-bold">모집 조건과 테스트 항목 {detail.testItems.length}개</summary>
      <div className="flex flex-col gap-4 pt-4 text-sm">
        <div className="flex flex-col gap-1">
          <p className="font-bold">모집 조건</p>
          <p className="whitespace-pre-line text-text-muted">{detail.conditions || "따로 정한 조건이 없어요"}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-bold">테스트 항목</p>
          <ol className="flex list-decimal flex-col gap-1 pl-5">
            {detail.testItems.map((item) => (
              <li key={item.id}>
                <span className="font-semibold">{item.title}</span>
                <Badge tone={item.required ? "neutral" : "outline"} className="ml-2">
                  {item.required ? "필수" : "선택"}
                </Badge>
                {item.description && <span className="text-text-muted"> · {item.description}</span>}
                <div className="pt-1">
                  <TestItemImages item={item} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </details>
  );
}

/** 탭 줄. 탭 상태는 URL의 tab에만 둔다 */
export function RecruitmentTabs({ basePath, current }: { basePath: string; current: ManageTab }) {
  return (
    <nav aria-label="모집 관리 탭" className="border-b border-line">
      <ul className="flex gap-1">
        {MANAGE_TABS.map((tab) => {
          const active = tab.value === current;
          return (
            <li key={tab.value}>
              <Link
                href={`${basePath}?tab=${tab.value}`}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex border-b-2 px-3 py-3 text-sm font-bold transition-colors duration-300 ease-brand",
                  active ? "border-text text-text" : "border-transparent text-text-muted hover:text-text",
                )}
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
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-surface-muted p-8">
        <p className="text-lg font-semibold">구독 모집에서 분석을 볼 수 있어요</p>
        <p className="text-sm text-text-muted">구독하면 지원·제출·신고 흐름을 숫자로 확인할 수 있어요.</p>
        <LinkButton href="/my/subscription" className="mt-2">
          구독 알아보기
        </LinkButton>
      </div>
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
    <dl className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {tiles.map(([term, value]) => (
        <div key={term} className="flex flex-col gap-2 rounded-2xl bg-surface-muted p-5">
          <dt className="text-sm text-text-muted">{term}</dt>
          <dd className="text-3xl font-extrabold tracking-[-0.03em]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
