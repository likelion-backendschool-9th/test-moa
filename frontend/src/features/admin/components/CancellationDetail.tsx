import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate, formatElapsed } from "@/lib/format";
import {
  CANCELLATION_DECISION_LABEL,
  cancellationRejectText,
  hasTestingStarted,
  type CancellationRequest,
} from "../types";

const panelClass = "flex flex-col gap-4 rounded-2xl bg-surface-muted p-6 md:p-8";
const infoGridClass = "grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]";

/** 처리 판단에 필요한 정보. 승인하면 무엇이 함께 취소되는지, 테스트가 이미 시작됐는지 보여 준다 */
export function CancellationDetail({ cancellation, now }: { cancellation: CancellationRequest; now: Date }) {
  const pending = !cancellation.review;
  const testingStarted = hasTestingStarted(cancellation);
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/cancellations" className="self-start text-sm font-semibold text-text-muted hover:text-text">
        목록으로
      </Link>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="muted">모집 취소 요청</Badge>
          {testingStarted && <Badge tone="neutral">테스트 시작됨</Badge>}
        </div>
        <h2 className="text-2xl font-extrabold tracking-[-0.03em]">{cancellation.recruitmentName}</h2>
      </div>

      <section aria-labelledby="cancellation-info-heading" className={panelClass}>
        <h3 id="cancellation-info-heading" className="text-lg font-extrabold">
          요청 내용
        </h3>
        <dl className={infoGridClass}>
          <Info label="모집 건">{cancellation.recruitmentName}</Info>
          <Info label="개발자">{cancellation.developerNickname}</Info>
          <Info label="요청 사유">{cancellation.reason}</Info>
          <Info label="요청">
            {formatDate(cancellation.createdAt)} · {formatElapsed(cancellation.createdAt, now)}
          </Info>
        </dl>
        <LinkButton href={`/recruitments/${cancellation.recruitmentSlug}`} variant="secondary" size="sm" className="self-start">
          모집 글 보기
        </LinkButton>
      </section>

      <section aria-labelledby="cancellation-status-heading" className={panelClass}>
        <h3 id="cancellation-status-heading" className="text-lg font-extrabold">
          모집 건 현황
        </h3>
        <dl className={infoGridClass}>
          <Info label="모집 상태">{testingStarted ? "테스트 중" : "모집 중"}</Info>
          <Info label="확정 테스터">{cancellation.confirmedCount}명</Info>
          <Info label="제출된 피드백">{cancellation.submittedFeedbackCount}건</Info>
        </dl>
        {testingStarted && <p className="text-sm font-bold">이미 테스트가 시작됐어요.</p>}
        {pending && <ApprovalImpact cancellation={cancellation} testingStarted={testingStarted} />}
      </section>
    </div>
  );
}

/** 승인하면 함께 일어나는 일. 보상은 테스트를 완료해야 지급되므로 테스트 전 취소에는 지급할 보상이 없다 */
function ApprovalImpact({ cancellation, testingStarted }: { cancellation: CancellationRequest; testingStarted: boolean }) {
  if (cancellation.confirmedCount === 0) return <p className="text-sm text-text-muted">확정된 테스터가 없어요.</p>;
  return (
    <p className="text-sm text-text-muted">
      승인하면 확정 테스터 {cancellation.confirmedCount}명의 참여도 함께 취소돼요.
      {!testingStarted && " 테스트 전이라 지급할 보상은 없어요."}
    </p>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </>
  );
}

/** 처리한 요청. 결과는 바꿀 수 없어서 읽기만 한다 */
export function CancellationResult({ cancellation, now }: { cancellation: CancellationRequest; now: Date }) {
  const review = cancellation.review;
  if (!review) return null;
  return (
    <section aria-labelledby="cancellation-result-heading" className={panelClass}>
      <h3 id="cancellation-result-heading" className="text-lg font-extrabold">
        처리 결과
      </h3>
      <dl className={infoGridClass}>
        <Info label="결과">
          <Badge tone="neutral">{CANCELLATION_DECISION_LABEL[review.decision]}</Badge>
        </Info>
        {review.decision === "rejected" && <Info label="반려 사유">{cancellationRejectText(review)}</Info>}
        {review.decision === "rejected" && review.reason !== "other" && review.memo && <Info label="운영자 메모">{review.memo}</Info>}
        <Info label="처리">
          {formatDate(review.processedAt)} · {formatElapsed(review.processedAt, now)}
        </Info>
      </dl>
    </section>
  );
}

export function CancellationDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="모집 취소 요청 불러오는 중" className="flex flex-col gap-6">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-8 w-56 max-w-full" />
      <div className={panelClass} data-skeleton="cancellation-detail">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
