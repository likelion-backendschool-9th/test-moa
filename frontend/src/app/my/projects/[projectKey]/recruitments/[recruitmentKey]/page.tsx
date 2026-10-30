import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { ApplicantList } from "@/features/project/components/ApplicantList";
import { FeedbackList } from "@/features/project/components/FeedbackList";
import { DetailSkeleton } from "@/features/project/components/ProjectDetail";
import {
  AnalyticsPanel,
  parseManageTab,
  RecruitmentSummary,
  RecruitmentTabs,
} from "@/features/project/components/RecruitmentManage";
import { getRecruitmentDetail } from "@/features/project/service";

/* 테스트 모집 관리 (/my/projects/:projectKey/recruitments/:recruitmentKey). 탭은 ?tab=testers|feedback|analytics */

export const metadata: Metadata = { title: "테스트 모집 관리" };

type Props = PageProps<"/my/projects/[projectKey]/recruitments/[recruitmentKey]">;

export default function RecruitmentManagePage({ params, searchParams }: Props) {
  return (
    <Container className="py-10">
      <Suspense fallback={<DetailSkeleton />}>
        <ManageSlot params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function ManageSlot({ params, searchParams }: Props) {
  const { projectKey, recruitmentKey } = await params;
  const basePath = `/my/projects/${projectKey}/recruitments/${recruitmentKey}`;
  const [{ project, recruitment, applications, feedbacks, analytics }, { tab }] = await Promise.all([
    getRecruitmentDetail(basePath, projectKey, recruitmentKey),
    searchParams,
  ]);
  const current = parseManageTab(tab);
  /* 구독 모집이고 모집 마감 전이면 지원자를 직접 고를 수 있다 */
  const canSelect = recruitment.isSubscription && (recruitment.status === "recruiting" || recruitment.status === "full");

  return (
    <div className="flex flex-col gap-8">
      <RecruitmentSummary project={project} recruitment={recruitment} analytics={analytics} />
      <RecruitmentTabs basePath={basePath} current={current} />
      {current === "testers" && (
        <ApplicantList
          applications={applications}
          capacity={recruitment.capacity}
          canSelect={canSelect}
          isSubscription={recruitment.isSubscription}
        />
      )}
      {current === "feedback" && <FeedbackList feedbacks={feedbacks} />}
      {current === "analytics" && <AnalyticsPanel isSubscription={recruitment.isSubscription} analytics={analytics} />}
    </div>
  );
}
