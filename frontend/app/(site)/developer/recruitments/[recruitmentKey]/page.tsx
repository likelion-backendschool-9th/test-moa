import type { Metadata } from "next";
import { Suspense } from "react";
import { recruitmentManagePath } from "@/features/project/paths";
import { Container } from "@/components/ui/Container/Container";
import { ApplicantList } from "@/app/(site)/developer/recruitments/[recruitmentKey]/_components/ApplicantList/ApplicantList";
import { FeedbackList } from "@/app/(site)/developer/recruitments/[recruitmentKey]/_components/FeedbackList/FeedbackList";
import { DetailSkeleton } from "@/app/(site)/developer/_components/ProjectDetail/ProjectDetail";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import {
  AnalyticsPanel,
  parseManageTab,
  RecruitmentHeader,
  RecruitmentInfoPanel,
  RecruitmentTabs,
} from "@/app/(site)/developer/recruitments/[recruitmentKey]/_components/RecruitmentManage/RecruitmentManage";
import {
  AiAnalysisPanel,
  AiAnalysisSkeleton,
} from "@/app/(site)/developer/recruitments/[recruitmentKey]/_components/AiAnalysisPanel/AiAnalysisPanel";
import { canSelectApplicants } from "@/features/recruitment/types";
import { getAiAnalysis, getRecruitmentDetail } from "@/features/recruitment/api";
import styles from "./page.module.css";

/* 테스트 모집 관리 (/developer/recruitments/:recruitmentKey). 탭은 ?tab=info|testers|feedback|analytics|versions, 없으면 모집 정보 */

export const metadata: Metadata = { title: "테스트 모집 관리" };

type Props = PageProps<"/developer/recruitments/[recruitmentKey]">;

export default function RecruitmentManagePage({ params, searchParams }: Props) {
  return (
    <Container className={styles.recruitmentManagePage}>
      <Suspense fallback={<DetailSkeleton />}>
        <ManageSlot params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function ManageSlot({ params, searchParams }: Props) {
  const { recruitmentKey } = await params;
  const basePath = recruitmentManagePath(recruitmentKey);
  const [{ project, recruitment, applications, feedbacks, analytics, detail, cancellation, canCancel, locks }, { tab }] = await Promise.all([
    getRecruitmentDetail(basePath, recruitmentKey),
    searchParams,
  ]);
  const current = parseManageTab(tab);

  return (
    <div className={styles.manageSlot}>
      <div className={styles.manageHead}>
        <RecruitmentHeader
          project={project}
          recruitment={recruitment}
          feedbackCount={analytics.feedbackCount}
          selectionMode={detail.selectionMode}
        />
        <RecruitmentTabs basePath={basePath} current={current} feedbackCount={analytics.feedbackCount} />
      </div>
      {current === "info" && (
        <RecruitmentInfoPanel
          project={project}
          locks={locks}
          recruitment={recruitment}
          analytics={analytics}
          detail={detail}
          cancellation={cancellation}
          canCancel={canCancel}
        />
      )}
      {current === "testers" && (
        <ApplicantList
          applications={applications}
          canSelect={canSelectApplicants(recruitment, detail.selectionMode)}
          recruitmentKey={recruitmentKey}
          isSubscription={recruitment.isSubscription}
          selectionMode={detail.selectionMode}
          recruitDeadline={recruitment.recruitDeadline}
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
      {current === "versions" && <EmptyState title="버전 별 분석은 준비 중이에요" description="이 화면은 다음 작업에서 만들 예정이에요." />}
    </div>
  );
}

async function AiSlot({ basePath, recruitmentKey }: { basePath: string; recruitmentKey: string }) {
  return <AiAnalysisPanel analysis={await getAiAnalysis(basePath, recruitmentKey)} />;
}
