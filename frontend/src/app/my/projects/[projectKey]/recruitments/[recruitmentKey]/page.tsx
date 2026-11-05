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
import { AiAnalysisPanel, AiAnalysisSkeleton } from "@/features/project/components/AiAnalysisPanel";
import { canSelectApplicants, getAiAnalysis, getRecruitmentDetail } from "@/features/project/service";

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
  const [{ project, recruitment, applications, feedbacks, analytics, detail, cancellation, canCancel }, { tab }] = await Promise.all([
    getRecruitmentDetail(basePath, projectKey, recruitmentKey),
    searchParams,
  ]);
  const current = parseManageTab(tab);

  return (
    <div className="flex flex-col gap-8">
      <RecruitmentSummary
        project={project}
        recruitment={recruitment}
        analytics={analytics}
        detail={detail}
        cancellation={cancellation}
        canCancel={canCancel}
      />
      <RecruitmentTabs basePath={basePath} current={current} />
      {current === "testers" && (
        <ApplicantList
          applications={applications}
          capacity={recruitment.capacity}
          canSelect={canSelectApplicants(recruitment, detail.selectionMode)}
          projectKey={projectKey}
          recruitmentKey={recruitmentKey}
          isSubscription={recruitment.isSubscription}
          selectionMode={detail.selectionMode}
        />
      )}
      {current === "feedback" && <FeedbackList feedbacks={feedbacks} testItems={detail.testItems} />}
      {current === "analytics" && <AnalyticsPanel isSubscription={recruitment.isSubscription} analytics={analytics} />}
      {/* AI 분석은 느릴 수 있어서 숫자 카드와 따로 기다린다. 구독 모집에서만 보인다 */}
      {current === "analytics" && recruitment.isSubscription && (
        <Suspense fallback={<AiAnalysisSkeleton />}>
          <AiSlot basePath={basePath} projectKey={projectKey} recruitmentKey={recruitmentKey} />
        </Suspense>
      )}
    </div>
  );
}

async function AiSlot({ basePath, projectKey, recruitmentKey }: { basePath: string; projectKey: string; recruitmentKey: string }) {
  return <AiAnalysisPanel analysis={await getAiAnalysis(basePath, projectKey, recruitmentKey)} />;
}
