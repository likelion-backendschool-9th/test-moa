import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { RecruitmentAnalytics, RecruitmentView } from "../service";
import type { Project } from "../types";
import { RecruitmentStatusBadge } from "./StatusBadge";

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
};

/** 모집 건 요약. 탭 위에 늘 보인다 */
export function RecruitmentSummary({ project, recruitment, analytics }: SummaryProps) {
  const facts = [
    ["확정 인원", `${recruitment.confirmedCount}명`],
    ["정원", `${recruitment.capacity}명`],
    ["지원", `${analytics.applicationCount}명`],
    ["피드백 제출", `${analytics.feedbackCount}건`],
    ["모집 마감", formatDate(recruitment.recruitDeadline)],
    ["제출 마감", formatDate(recruitment.submitDeadline)],
  ];
  return (
    <div className="flex flex-col gap-4">
      <Link href={`/my/projects/${project.key}`} className="w-fit text-sm font-semibold text-text-muted hover:text-text">
        프로젝트로 돌아가기
      </Link>
      <p className="text-sm text-text-muted">{project.name}</p>
      <div className="flex flex-wrap items-center gap-2">
        <RecruitmentStatusBadge status={recruitment.status} />
        {recruitment.isSubscription && <Badge tone="muted">구독 모집</Badge>}
      </div>
      <h1 className="text-3xl font-extrabold tracking-[-0.03em]">{recruitment.request}</h1>
      <dl className="grid grid-cols-2 gap-4 rounded-2xl bg-surface-muted p-5 sm:grid-cols-3 lg:grid-cols-6">
        {facts.map(([term, value]) => (
          <div key={term} className="flex flex-col gap-1">
            <dt className="text-xs text-text-muted">{term}</dt>
            <dd className="font-bold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
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
