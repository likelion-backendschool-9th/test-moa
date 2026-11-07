import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge/Badge";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { formatDate } from "@/lib/format";
import type { AiAnalysis } from "@/features/recruitment/types";
import type { AiFinding } from "@/features/recruitment/types";
import { Card } from "@/components/ui/Card/Card";
import styles from "./AiAnalysisPanel.module.css";

/*
 * 분석 탭 아래의 AI 분석 영역. 지금은 AI가 없어 시연용 샘플을 보여 준다.
 * PRODUCT.md "확정된 사실만 말한다"에 따라 항목마다 근거 피드백 수를 붙이고, 틀릴 수 있다고 알린다.
 */

/** AI 분석 영역 바깥 틀. 상태와 상관없이 제목은 같다 */
function Frame({ badge, children }: { badge?: ReactNode; children: ReactNode }) {
  return (
    <Card as="section" aria-labelledby="ai-heading" className={styles.frame}>
      <div className={styles.frameBox}>
        <h2 id="ai-heading" className={styles.frameTitle}>
          AI 분석
        </h2>
        {badge}
      </div>
      {children}
    </Card>
  );
}

/** 묶음 제목. 항목 수를 옆에 붙인다 */
function GroupTitle({ title, count }: { title: string; count: number }) {
  return (
    <h3 className={styles.groupTitle}>
      {title} <span className={styles.groupTitleCount}>{count}</span>
    </h3>
  );
}

/** 근거 피드백 수. 문장 바로 옆에 붙여 어느 항목의 숫자인지 헷갈리지 않게 한다 */
function Evidence({ item }: { item: AiFinding }) {
  return <Badge tone="muted">피드백 {item.feedbackCount}건</Badge>;
}

/** AI 분석 결과, 피드백 부족, 정리 전 상태를 그린다 */
export function AiAnalysisPanel({ analysis }: { analysis: AiAnalysis }) {
  if (analysis.state === "notEnough") {
    return (
      <Frame>
        <p className={styles.text}>피드백이 {analysis.minFeedbacks}건 이상 모이면 AI가 정리해 드려요</p>
        <p className={styles.text2}>지금 피드백 {analysis.feedbackCount}건</p>
      </Frame>
    );
  }
  if (analysis.state === "empty") {
    return (
      <Frame>
        <p className={styles.text3}>아직 정리된 내용이 없어요</p>
      </Frame>
    );
  }

  const { summary } = analysis;
  return (
    <Frame badge={summary.isSample && <Badge tone="muted">시연용 샘플</Badge>}>
      <p className={styles.headline}>{summary.headline}</p>
      {/* 고칠 점: 문제마다 바로 아래에 해결 제안을 붙여 무엇을 고치면 되는지 한 번에 보이게 한다 */}
      {summary.issues.length > 0 && (
        <div className={styles.box}>
          <GroupTitle title="고칠 점" count={summary.issues.length} />
          <ul className={styles.list}>
            {summary.issues.map((item) => (
              <li key={item.text} className={styles.root}>
                <p className={styles.text4}>
                  {item.text} <Evidence item={item} />
                </p>
                {item.suggestion && (
                  <p className={styles.text5}>
                    <span className={styles.label}>제안</span> {item.suggestion}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {summary.strengths.length > 0 && (
        <div className={styles.box2}>
          <GroupTitle title="좋았던 점" count={summary.strengths.length} />
          <ul className={styles.list2}>
            {summary.strengths.map((item) => (
              <li key={item.text} className={styles.root2}>
                {item.text} <Evidence item={item} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className={styles.text6}>
        AI가 정리한 내용이라 틀릴 수 있어요 · {formatDate(summary.generatedAt)} 정리
      </p>
    </Frame>
  );
}

/** AI 분석을 기다리는 동안 보이는 자리 */
export function AiAnalysisSkeleton() {
  return (
    <Frame>
      <div data-testid="ai-skeleton" className={styles.aiAnalysisSkeletonBox}>
        <Skeleton className={styles.aiAnalysisSkeletonSkeleton} />
        <Skeleton className={styles.aiAnalysisSkeletonSkeleton2} />
        <Skeleton className={styles.aiAnalysisSkeletonSkeleton3} />
      </div>
    </Frame>
  );
}
