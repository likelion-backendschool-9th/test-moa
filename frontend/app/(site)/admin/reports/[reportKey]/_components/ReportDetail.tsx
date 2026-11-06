import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate, formatElapsed } from "@/lib/format";
import { processReport } from "@/features/report/actions";
import { isOverdue, REPORT_DECISION_LABEL, REPORT_TARGET_LABEL, REVIEW_MEMO_MAX_LENGTH, type Report } from "@/features/report/types";
import { reportsHref, type ReportListView } from "@/features/report/paths";

export type ReviewFormError = "decision" | "memo";

const ERROR_MESSAGE: Record<ReviewFormError, string> = {
  decision: "처리 결과를 골라 주세요.",
  memo: "시연용 저장 공간이 모자라 처리하지 못했어요. 메모를 줄이거나 demo-reports 쿠키를 지운 뒤 다시 시도해 주세요.",
};

const panelClass = "flex flex-col gap-4 rounded-2xl bg-surface-muted p-6 md:p-8";

/** 신고 내용과 대상. 피드백 원문은 신고 검토에 필요해서 여기서만 보여 준다 */
export function ReportDetail({ report, now, view }: { report: Report; now: Date; view: ReportListView }) {
  const pending = !report.review;
  return (
    <div className="flex flex-col gap-6">
      <Link href={reportsHref(view)} className="self-start text-sm font-semibold text-text-muted hover:text-text">
        목록으로
      </Link>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="muted">{REPORT_TARGET_LABEL[report.targetType]} 신고</Badge>
          {pending && report.holdsReward && <Badge tone="muted">보상 보류 중</Badge>}
          {pending && isOverdue(report, now) && <Badge tone="neutral">72시간 지남</Badge>}
        </div>
        <h2 className="text-2xl font-extrabold tracking-[-0.03em]">{report.reason}</h2>
      </div>

      <section aria-labelledby="report-info-heading" className={panelClass}>
        <h3 id="report-info-heading" className="text-lg font-extrabold">
          신고 내용
        </h3>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
          <Info label="모집 건">{report.recruitmentName}</Info>
          <Info label="신고한 사람">{report.reporterNickname}</Info>
          {report.targetNickname && (
            <Info label={report.targetType === "user" ? "대상 회원" : "대상 테스터"}>
              {/* 대상 회원의 제재 이력과 다른 신고를 회원 관리에서 이어 본다 */}
              {report.targetUserKey ? (
                <Link href={`/admin/users/${report.targetUserKey}`} className="underline underline-offset-4 hover:text-text-muted">
                  {report.targetNickname}
                </Link>
              ) : (
                report.targetNickname
              )}
            </Info>
          )}
          <Info label="접수">
            {formatDate(report.createdAt)} · {formatElapsed(report.createdAt, now)}
          </Info>
        </dl>
      </section>

      {report.targetType === "feedback" && report.feedback && (
        <section aria-labelledby="feedback-heading" className={panelClass}>
          <h3 id="feedback-heading" className="text-lg font-extrabold">
            제출된 피드백
          </h3>
          <blockquote className="whitespace-pre-line text-sm">{report.feedback}</blockquote>
        </section>
      )}

      {report.targetType === "recruitment" && (
        <LinkButton href={`/recruitments/${report.recruitmentSlug}`} variant="secondary" size="sm" className="self-start">
          모집 글 보기
        </LinkButton>
      )}
    </div>
  );
}

/* 메모는 공백 없는 긴 문자열이나 URL일 수 있어서, 좁은 화면에서도 칸 안에서 줄을 바꾼다 */
function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-semibold wrap-anywhere">{children}</dd>
    </>
  );
}

/** 처리 양식. 서버 양식이라 확인도 서버에서 하고, 문제가 있으면 error와 함께 돌아온다 */
export function ReviewForm({ report, error, view }: { report: Report; error: ReviewFormError | null; view: ReportListView }) {
  const upheldDetail =
    report.targetType === "feedback" ? "제재 이력에 반영되고, 이 피드백의 보상은 지급하지 않아요." : "제재 이력에 반영돼요.";
  return (
    <form action={processReport} aria-labelledby="review-heading" className={panelClass}>
      <h3 id="review-heading" className="text-lg font-extrabold">
        처리하기
      </h3>
      <input type="hidden" name="reportKey" value={report.id} />
      {/* 처리한 뒤 보던 목록으로 돌아가려고 탭과 필터를 함께 보낸다 */}
      <input type="hidden" name="tab" value={view.tab} />
      <input type="hidden" name="target" value={view.target} />
      <fieldset className="flex flex-col gap-3" aria-describedby={error === "decision" ? "review-error" : undefined}>
        <legend className="mb-3 text-sm font-semibold">처리 결과</legend>
        <Choice value="dismissed" label="기각" detail={report.holdsReward ? "문제가 없어요. 보류된 보상이 지급돼요." : "문제가 없어요."} />
        <Choice value="upheld" label="인정" detail={upheldDetail} />
      </fieldset>
      {error && (
        <p id="review-error" role="alert" className="text-sm font-semibold">
          {ERROR_MESSAGE[error]}
        </p>
      )}
      <label className="flex flex-col gap-2 text-sm font-semibold">
        처리 메모
        <textarea
          name="memo"
          rows={3}
          maxLength={REVIEW_MEMO_MAX_LENGTH}
          aria-describedby={error === "memo" ? "review-error" : undefined}
          placeholder={`판단 근거를 남겨 주세요 (선택, ${REVIEW_MEMO_MAX_LENGTH}자까지)`}
          className="rounded-2xl bg-surface-strong px-4 py-3 font-normal text-text placeholder:text-text-muted focus:outline-2 focus:outline-accent"
        />
      </label>
      <Button type="submit" className="self-start">
        처리하기
      </Button>
    </form>
  );
}

function Choice({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-strong px-4 py-3 has-checked:bg-line">
      <input type="radio" name="decision" value={value} className="mt-1 accent-accent" />
      <span className="flex flex-col gap-1">
        <span className="text-sm font-bold">{label}</span>
        <span className="text-sm text-text-muted">{detail}</span>
      </span>
    </label>
  );
}

/** 처리한 신고. 결과는 바꿀 수 없어서 읽기만 한다 */
export function ReviewResult({ report, now }: { report: Report; now: Date }) {
  if (!report.review) return null;
  return (
    <section aria-labelledby="review-result-heading" className={panelClass}>
      <h3 id="review-result-heading" className="text-lg font-extrabold">
        처리 결과
      </h3>
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
        <Info label="결과">
          <Badge tone="neutral">{REPORT_DECISION_LABEL[report.review.decision]}</Badge>
        </Info>
        <Info label="메모">{report.review.memo || "남긴 메모가 없어요"}</Info>
        <Info label="처리">
          {formatDate(report.review.processedAt)} · {formatElapsed(report.review.processedAt, now)}
        </Info>
      </dl>
    </section>
  );
}

export function ReportDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="신고 불러오는 중" className="flex flex-col gap-6">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-8 w-80 max-w-full" />
      <div className={panelClass} data-skeleton="report-detail">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
