import type { Metadata } from "next";
import { Suspense } from "react";
import { recruitmentManagePath } from "@/features/project/paths";
import { Container } from "@/components/ui/Container";
import { ApplicantList } from "@/app/(site)/developer/recruitments/[recruitmentKey]/_components/ApplicantList";
import { FeedbackList } from "@/app/(site)/developer/recruitments/[recruitmentKey]/_components/FeedbackList";
import { DetailSkeleton } from "@/app/(site)/developer/_components/ProjectDetail";
import {
  AnalyticsPanel,
  parseManageTab,
  RecruitmentSummary,
  RecruitmentTabs,
} from "@/app/(site)/developer/recruitments/[recruitmentKey]/_components/RecruitmentManage";
import { AiAnalysisPanel, AiAnalysisSkeleton } from "@/app/(site)/developer/recruitments/[recruitmentKey]/_components/AiAnalysisPanel";
import { canSelectApplicants, getAiAnalysis, getRecruitmentDetail } from "@/features/project/service";

/* 테스트 모집 관리 (/developer/recruitments/:recruitmentKey). 탭은 ?tab=testers|feedback|analytics */

export const metadata: Metadata = { title: "테스트 모집 관리" };

type Props = PageProps<"/developer/recruitments/[recruitmentKey]">;

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
  const { recruitmentKey } = await params;
  const basePath = recruitmentManagePath(recruitmentKey);
  const [{ project, recruitment, applications, feedbacks, analytics, detail, cancellation, canCancel }, { tab }] = await Promise.all([
    getRecruitmentDetail(basePath, recruitmentKey),
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
          canSelect={canSelectApplicants(recruitment, detail.selectionMode)}
          recruitmentKey={recruitmentKey}
          isSubscription={recruitment.isSubscription}
          selectionMode={detail.selectionMode}
        />
      )}
      {current === "feedback" && (
        <FeedbackList
          feedbacks={feedbacks}
          testItems={detail.testItems}
          recruitmentKey={recruitmentKey}
          isSubscription={recruitment.isSubscription}
        />
      )}
      {current === "analytics" && <AnalyticsPanel isSubscription={recruitment.isSubscription} analytics={analytics} />}
      {/* AI 분석은 느릴 수 있어서 숫자 카드와 따로 기다린다. 구독 모집에서만 보인다 */}
      {current === "analytics" && recruitment.isSubscription && (
        <Suspense fallback={<AiAnalysisSkeleton />}>
          <AiSlot basePath={basePath} recruitmentKey={recruitmentKey} />
        </Suspense>
      )}
    </div>
  );
}

async function AiSlot({ basePath, recruitmentKey }: { basePath: string; recruitmentKey: string }) {
  return <AiAnalysisPanel analysis={await getAiAnalysis(basePath, recruitmentKey)} />;
}
