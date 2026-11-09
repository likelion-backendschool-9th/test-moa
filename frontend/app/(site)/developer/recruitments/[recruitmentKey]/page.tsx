import type { Metadata } from "next";
import { Suspense } from "react";
import { recruitmentManagePath } from "@/features/project/paths";
import { Container } from "@/components/ui/Container/Container";
import { ApplicantList } from "@/app/(site)/developer/recruitments/[recruitmentKey]/_components/ApplicantList/ApplicantList";
import { FeedbackList } from "@/app/(site)/developer/recruitments/[recruitmentKey]/_components/FeedbackList/FeedbackList";
import { DetailSkeleton } from "@/app/(site)/developer/_components/ProjectDetail/ProjectDetail";
import { VersionComparisonPanel } from "@/app/(site)/developer/recruitments/[recruitmentKey]/_components/VersionComparisonPanel/VersionComparisonPanel";
import {
  AnalyticsLocked,
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
import { getAiAnalysis, getRecruitmentDetail, getVersionComparison } from "@/features/recruitment/api";
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
  const [{ project, recruitment, applications, feedbacks, analytics, detail, isSubscribed, cancellation, canCancel, locks }, { tab }] = await Promise.all([
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
          isSubscribed={isSubscribed}
          selectionMode={detail.selectionMode}
          recruitDeadline={recruitment.recruitDeadline}
        />
      )}
      {current === "feedback" && (
        <FeedbackList
          feedbacks={feedbacks}
          testItems={detail.testItems}
          recruitmentKey={recruitmentKey}
          isSubscribed={isSubscribed}
          confirmedCount={analytics.confirmedCount}
          submittedCount={analytics.submittedCount}
          submitDeadline={recruitment.submitDeadline}
          selectionMode={detail.selectionMode}
        />
      )}
      {current === "analytics" && !isSubscribed && <AnalyticsLocked />}
      {/* AI 분석은 느릴 수 있어서 머리·탭과 따로 기다린다. 구독 중인 계정에서만 보인다 */}
      {current === "analytics" && isSubscribed && (
        <Suspense fallback={<AiAnalysisSkeleton />}>
          <AiSlot basePath={basePath} recruitmentKey={recruitmentKey} repository={project.repository} />
        </Suspense>
      )}
      {current === "versions" && !isSubscribed && (
        <AnalyticsLocked
          title="구독하면 버전 별 분석을 볼 수 있어요"
          description="구독하면 AI가 직전 버전과 리뷰 그룹을 견줘 어떤 문제가 이어지고 새로 생겼는지 알려 줘요."
        />
      )}
      {current === "versions" && isSubscribed && (
        <Suspense fallback={<AiAnalysisSkeleton />}>
          <VersionSlot basePath={basePath} recruitmentKey={recruitmentKey} />
        </Suspense>
      )}
    </div>
  );
}

async function VersionSlot({ basePath, recruitmentKey }: { basePath: string; recruitmentKey: string }) {
  return <VersionComparisonPanel comparison={await getVersionComparison(basePath, recruitmentKey)} recruitmentKey={recruitmentKey} />;
}

async function AiSlot({ basePath, recruitmentKey, repository }: { basePath: string; recruitmentKey: string; repository?: string }) {
  return (
    <AiAnalysisPanel analysis={await getAiAnalysis(basePath, recruitmentKey)} repository={repository} recruitmentKey={recruitmentKey} />
  );
}
