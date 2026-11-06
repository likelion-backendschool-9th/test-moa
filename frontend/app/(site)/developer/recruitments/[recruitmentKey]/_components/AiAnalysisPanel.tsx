import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/format";
import type { AiAnalysis } from "../../../../../../features/project/service";
import type { AiFinding } from "../../../../../../features/project/types";

/*
 * 분석 탭 아래의 AI 분석 영역. 지금은 AI가 없어 시연용 샘플을 보여 준다.
 * PRODUCT.md "확정된 사실만 말한다"에 따라 항목마다 근거 피드백 수를 붙이고, 틀릴 수 있다고 알린다.
 */

/** AI 분석 영역 바깥 틀. 상태와 상관없이 제목은 같다 */
function Frame({ badge, children }: { badge?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby="ai-heading" className="flex flex-col gap-5 rounded-2xl bg-surface-muted p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="ai-heading" className="text-xl font-extrabold tracking-[-0.03em]">
          AI 분석
        </h2>
        {badge}
      </div>
      {children}
    </section>
  );
}

/** 묶음 제목. 항목 수를 옆에 붙인다 */
function GroupTitle({ title, count }: { title: string; count: number }) {
  return (
    <h3 className="font-extrabold">
      {title} <span className="text-text-muted">{count}</span>
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
        <p className="font-semibold">피드백이 {analysis.minFeedbacks}건 이상 모이면 AI가 정리해 드려요</p>
        <p className="text-sm text-text-muted">지금 피드백 {analysis.feedbackCount}건</p>
      </Frame>
    );
  }
  if (analysis.state === "empty") {
    return (
      <Frame>
        <p className="font-semibold">아직 정리된 내용이 없어요</p>
      </Frame>
    );
  }

  const { summary } = analysis;
  return (
    <Frame badge={summary.isSample && <Badge tone="muted">시연용 샘플</Badge>}>
      <p className="text-lg font-semibold">{summary.headline}</p>
      {/* 고칠 점: 문제마다 바로 아래에 해결 제안을 붙여 무엇을 고치면 되는지 한 번에 보이게 한다 */}
      {summary.issues.length > 0 && (
        <div className="flex flex-col gap-3">
          <GroupTitle title="고칠 점" count={summary.issues.length} />
          <ul className="flex flex-col gap-3">
            {summary.issues.map((item) => (
              <li key={item.text} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {item.text} <Evidence item={item} />
                </p>
                {item.suggestion && (
                  <p className="text-sm text-text-muted">
                    <span className="font-bold text-text">제안</span> {item.suggestion}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {summary.strengths.length > 0 && (
        <div className="flex flex-col gap-3">
          <GroupTitle title="좋았던 점" count={summary.strengths.length} />
          <ul className="flex flex-col gap-2">
            {summary.strengths.map((item) => (
              <li key={item.text} className="flex flex-wrap items-center gap-2">
                {item.text} <Evidence item={item} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="border-t border-line pt-4 text-xs text-text-muted">
        AI가 정리한 내용이라 틀릴 수 있어요 · {formatDate(summary.generatedAt)} 정리
      </p>
    </Frame>
  );
}

/** AI 분석을 기다리는 동안 보이는 자리 */
export function AiAnalysisSkeleton() {
  return (
    <Frame>
      <div data-testid="ai-skeleton" className="flex flex-col gap-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Frame>
  );
}
