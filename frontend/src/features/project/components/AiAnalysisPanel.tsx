import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/format";
import type { AiAnalysis } from "../service";
import type { AiFinding } from "../types";

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

/** 근거 수가 붙은 항목 목록 (자주 나온 문제, 좋았던 점) */
function FindingList({ title, items }: { title: string; items: AiFinding[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-bold text-text-muted">{title}</h3>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.text} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span>{item.text}</span>
            <span className="text-sm text-text-muted">피드백 {item.feedbackCount}건</span>
          </li>
        ))}
      </ul>
    </div>
  );
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
      <div className="grid gap-6 md:grid-cols-2">
        <FindingList title="자주 나온 문제" items={summary.issues} />
        <FindingList title="좋았던 점" items={summary.strengths} />
      </div>
      {summary.suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-text-muted">개선 제안</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {summary.suggestions.map((text) => (
              <li key={text}>{text}</li>
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
