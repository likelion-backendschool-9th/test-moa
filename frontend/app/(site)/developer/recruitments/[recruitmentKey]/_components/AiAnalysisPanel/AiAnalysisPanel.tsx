import type { ReactNode } from "react";
import { ScanIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";
import { Card } from "@/components/ui/Card/Card";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { formatDateTime } from "@/lib/format";
import { startAnalysisAction } from "@/features/recruitment/actions";
import { buildReviewMix, sortReviewGroups, type AiAnalysis } from "@/features/recruitment/types";
import { AnalysisToolbar } from "../AnalysisToolbar/AnalysisToolbar";
import { ReviewGroups } from "../ReviewGroups/ReviewGroups";
import { ReviewMix } from "../ReviewMix/ReviewMix";
import { TrendChart } from "../TrendChart/TrendChart";
import styles from "./AiAnalysisPanel.module.css";

/*
 * 리뷰 분석 탭. 분석 요약 숫자, 하루·일주일·30일 구간별 리뷰 수, 리뷰 그룹과 이슈 제안, 칭찬 한 줄을 보여 준다.
 * 리뷰 수와 시간대 별 수는 피드백에서 세고, 그룹과 칭찬은 AI 분석 결과(AUTH_MODE=backend가 아니면 시연용 샘플)다.
 */

/** 섹션 머리. 제목 오른쪽에 기준을 작게 둔다 */
function SectionHead({ id, title, note }: { id: string; title: string; note?: ReactNode }) {
  return (
    <div className={styles.sectionHead}>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      {note && <p className={styles.sectionNote}>{note}</p>}
    </div>
  );
}

/** 리뷰 분석 결과, 피드백 부족, 정리 전 상태를 그린다 */
type AiAnalysisPanelProps = {
  analysis: AiAnalysis;
  /** 프로젝트에 연결한 GitHub 레포. 없으면 이슈를 등록할 수 없다 */
  repository?: string;
  /** 모집 건 키. 분석 실행과 이슈 초안 저장·등록에 쓴다 */
  recruitmentKey: string;
};

export function AiAnalysisPanel({ analysis, repository, recruitmentKey }: AiAnalysisPanelProps) {
  const run = startAnalysisAction.bind(null, recruitmentKey);
  if (analysis.state === "notEnough") {
    return (
      <Card as="section" className={styles.message}>
        <p className={styles.messageTitle}>피드백이 {analysis.minFeedbacks}건 이상 모이면 AI가 정리해 드려요</p>
        <p className={styles.messageText}>지금 피드백 {analysis.feedbackCount}건</p>
      </Card>
    );
  }
  if (analysis.state === "empty") {
    return (
      <div className={styles.root}>
        <AnalysisToolbar analyzedAt={null} onRun={run} running={analysis.status === "PENDING"} failed={analysis.status === "FAILED"} />
        <Card as="section" className={styles.message}>
          <p className={styles.messageTitle}>아직 정리된 내용이 없어요</p>
        </Card>
      </div>
    );
  }

  const { summary } = analysis;
  const groups = sortReviewGroups(summary.groups);
  const criticalCount = groups.filter((group) => group.severity === 1).length;
  const stats: Array<[term: string, value: number, critical?: boolean]> = [
    ["총 리뷰 수", summary.totalCount],
    ["오늘 등록 리뷰", summary.todayCount],
    ["리뷰 그룹", groups.length],
    ["치명 문제", criticalCount, criticalCount > 0],
  ];

  return (
    <div className={styles.root}>
      <AnalysisToolbar analyzedAt={summary.analyzedAt} onRun={run} running={analysis.status === "PENDING"} failed={analysis.status === "FAILED"} />
      {(summary.analyticsSummary || summary.unanalyzedCount > 0) && (
        <div className={styles.lead}>
          {/* 리뷰 전체를 한 문장으로 요약한 분석(analytics_summary). 화면에서 가장 먼저 읽을 문장이다 */}
          {summary.analyticsSummary && (
            <section aria-labelledby="review-headline-heading" className={styles.headline}>
              <span aria-hidden="true" className={styles.headlineIcon}>
                <ScanIcon weight="bold" />
              </span>
              <div className={styles.headlineText}>
                <h2 id="review-headline-heading" className={styles.headlineLabel}>
                  핵심 요약
                </h2>
                <p className={styles.headlineTitle}>{summary.analyticsSummary}</p>
                <p className={styles.headlineNote}>
                  리뷰 {summary.totalCount}건을 {groups.length}개 그룹으로 묶어 AI가 정리했어요
                </p>
              </div>
            </section>
          )}
          {summary.unanalyzedCount > 0 && (
            <p role="status" className={styles.pending}>
              <WarningCircleIcon aria-hidden="true" className={styles.pendingIcon} />새 피드백 {summary.unanalyzedCount}건이 아직 분석에
              반영되지 않았어요.
            </p>
          )}
        </div>
      )}
      <section aria-labelledby="review-summary-heading" className={styles.section}>
        <SectionHead id="review-summary-heading" title="분석 요약" />
        <dl className={styles.stats}>
          {stats.map(([term, value, critical]) => (
            <Card as="div" key={term} className={styles.stat}>
              <dt className={styles.statTerm}>{term}</dt>
              <dd className={critical ? styles.statCritical : styles.statValue}>{value}</dd>
            </Card>
          ))}
        </dl>
      </section>

      {/* 넓은 화면에서 반씩: 왼쪽 시간대별 리뷰 수, 오른쪽 리뷰 성향 */}
      <div className={styles.split}>
        <section aria-labelledby="review-hourly-heading" className={styles.splitSection}>
          <SectionHead id="review-hourly-heading" title="시간대별 분석 현황" note="어제 기준 · 매일 00:00 갱신" />
          <TrendChart trends={summary.trends} />
        </section>
        <section aria-labelledby="review-mix-heading" className={styles.splitSection}>
          <SectionHead id="review-mix-heading" title="리뷰 성향" note="태그 · 그룹 · 심각도 별" />
          <ReviewMix mix={buildReviewMix(groups, summary.praiseReviews.length)} />
        </section>
      </div>

      <ReviewGroups groups={groups} repository={repository} recruitmentKey={recruitmentKey} />

      {(summary.praiseSummary || summary.praiseReviews.length > 0) && (
        <section aria-labelledby="review-praise-heading" className={styles.section}>
          <SectionHead
            id="review-praise-heading"
            title="칭찬 받았어요"
            note={summary.praiseReviews.length > 0 ? `칭찬 리뷰 ${summary.praiseReviews.length}건` : undefined}
          />
          <Card as="div" className={styles.praise}>
            {summary.praiseSummary && <p className={styles.praiseText}>“{summary.praiseSummary}”</p>}
            {/* 칭찬으로 묶인 리뷰를 채팅처럼: 테스터 이름과 항목 위에 말풍선, 오른쪽에 시각 */}
            {summary.praiseReviews.length > 0 && (
              <ul className={styles.praiseList}>
                {summary.praiseReviews.map((review) => (
                  <li key={review.id} className={styles.praiseItem}>
                    <p className={styles.praiseMeta}>
                      <strong className={styles.praiseNickname}>{review.testerNickname}</strong>
                      <span aria-hidden="true">·</span>
                      <span>{review.testItemTitle ?? "기타 의견"}</span>
                    </p>
                    <div className={styles.praiseRow}>
                      <p className={styles.praiseBubble}>{review.content}</p>
                      <time dateTime={review.submittedAt} className={styles.praiseTime}>
                        {formatDateTime(review.submittedAt)}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}

/** AI 분석을 기다리는 동안 보이는 자리 */
export function AiAnalysisSkeleton() {
  return (
    <Card as="section" className={styles.message}>
      <div data-testid="ai-skeleton" className={styles.aiAnalysisSkeletonBox}>
        <Skeleton className={styles.aiAnalysisSkeletonSkeleton} />
        <Skeleton className={styles.aiAnalysisSkeletonSkeleton2} />
        <Skeleton className={styles.aiAnalysisSkeletonSkeleton3} />
      </div>
    </Card>
  );
}
