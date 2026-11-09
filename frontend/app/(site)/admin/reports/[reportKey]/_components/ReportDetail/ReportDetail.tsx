import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { formatDate, formatElapsed } from "@/lib/format";
import { processReport } from "@/features/report/actions";
import {
  evidenceHref,
  formatFileSize,
  isOverdue,
  REPORT_DECISION_LABEL,
  REPORT_TARGET_LABEL,
  REVIEW_MEMO_MAX_LENGTH,
  type Report,
  type ReportEvidence,
} from "@/features/report/types";
import { reportsHref, type ReportListView } from "@/features/report/paths";
import { AdminPanel } from "@/app/(site)/admin/_components/AdminPanel/AdminPanel";
import styles from "./ReportDetail.module.css";

export type ReviewFormError = "decision" | "memo";

const ERROR_MESSAGE: Record<ReviewFormError, string> = {
  decision: "처리 결과를 골라 주세요.",
  memo: "시연용 저장 공간이 모자라 처리하지 못했어요. 메모를 줄이거나 demo-reports 쿠키를 지운 뒤 다시 시도해 주세요.",
};


/** 신고 내용과 대상. 피드백 원문은 신고 검토에 필요해서 여기서만 보여 준다 */
export function ReportDetail({ report, now, view }: { report: Report; now: Date; view: ReportListView }) {
  const pending = !report.review;
  return (
    <div className={styles.root}>
      <Link href={reportsHref(view)} className={styles.link}>
        목록으로
      </Link>
      <div className={styles.box}>
        <div className={styles.box2}>
          <Badge tone="muted">{REPORT_TARGET_LABEL[report.targetType]} 신고</Badge>
          {pending && report.holdsReward && <Badge tone="muted">보상 보류 중</Badge>}
          {pending && isOverdue(report, now) && <Badge tone="neutral">72시간 지남</Badge>}
        </div>
        <h2 className={styles.reason}>{report.reason}</h2>
      </div>

      <AdminPanel as="section" aria-labelledby="report-info-heading">
        <h3 id="report-info-heading" className={styles.title}>
          신고 내용
        </h3>
        <dl className={styles.list}>
          <Info label="모집 건">{report.recruitmentName}</Info>
          <Info label="신고한 사람">{report.reporterNickname}</Info>
          {report.targetNickname && (
            <Info label={report.targetType === "user" ? "대상 회원" : "대상 테스터"}>
              {/* 대상 회원의 제재 이력과 다른 신고를 회원 관리에서 이어 본다 */}
              {report.targetUserKey ? (
                <Link href={`/admin/users/${report.targetUserKey}`} className={styles.targetNickname}>
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
      </AdminPanel>

      {report.targetType === "feedback" && report.feedback && (
        <AdminPanel as="section" aria-labelledby="feedback-heading">
          <h3 id="feedback-heading" className={styles.title2}>
            제출된 피드백
          </h3>
          <blockquote className={styles.feedback}>{report.feedback}</blockquote>
        </AdminPanel>
      )}

      {report.evidences && report.evidences.length > 0 && <Evidences reportId={report.id} evidences={report.evidences} />}

      <div className={styles.actions}>
        {/* 실제 로그인에서는 모집 글 신고만 모집 id를 안다(그 밖에는 빈 값) */}
        {report.targetType === "recruitment" && report.recruitmentSlug && (
          <LinkButton href={`/recruitments/${report.recruitmentSlug}`} variant="secondary" size="sm">
            모집 글 보기
          </LinkButton>
        )}
        {/* 인정한 뒤 회원 관리에서 다시 찾지 않고 바로 제재 양식으로 간다 */}
        {report.targetUserKey && report.targetNickname && (
          <LinkButton href={`/admin/users/${report.targetUserKey}#sanction-form-heading`} variant="secondary" size="sm">
            {report.targetNickname} 제재하기
          </LinkButton>
        )}
      </div>
    </div>
  );
}

/** 증거 파일. 이미지는 미리보기, PDF는 이름만 보이고 누르면 새 탭에서 연다 */
function Evidences({ reportId, evidences }: { reportId: string; evidences: ReportEvidence[] }) {
  return (
    <AdminPanel as="section" aria-labelledby="evidence-heading">
      <h3 id="evidence-heading" className={styles.title2}>
        증거 파일 <span className={styles.count}>{evidences.length}</span>
      </h3>
      <ul className={styles.evidences}>
        {evidences.map((evidence) => {
          const href = evidenceHref(reportId, evidence.id);
          return (
            <li key={evidence.id}>
              <a href={href} target="_blank" rel="noreferrer" className={styles.evidence}>
                {evidence.contentType.startsWith("image/") ? (
                  /* 로그인 토큰이 필요한 비공개 파일이라 next/image 최적화를 거치지 않는다 */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={href} alt="" className={styles.thumb} />
                ) : (
                  <span aria-hidden className={styles.fileIcon}>
                    PDF
                  </span>
                )}
                <span className={styles.evidenceName}>{evidence.originalName}</span>
                <span className={styles.evidenceSize}>{formatFileSize(evidence.size)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </AdminPanel>
  );
}

/* 메모는 공백 없는 긴 문자열이나 URL일 수 있어서, 좁은 화면에서도 칸 안에서 줄을 바꾼다 */
function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className={styles.infoLabel}>{label}</dt>
      <dd className={styles.infoChildren}>{children}</dd>
    </>
  );
}

/** 처리 양식. 서버 양식이라 확인도 서버에서 하고, 문제가 있으면 error와 함께 돌아온다 */
export function ReviewForm({ report, error, view }: { report: Report; error: ReviewFormError | null; view: ReportListView }) {
  const upheldDetail =
    report.targetType === "feedback" ? "제재 이력에 반영되고, 이 피드백의 보상은 지급하지 않아요." : "제재 이력에 반영돼요.";
  return (
    <AdminPanel as="form" action={processReport} aria-labelledby="review-heading">
      <h3 id="review-heading" className={styles.reviewFormTitle}>
        처리하기
      </h3>
      <input type="hidden" name="reportKey" value={report.id} />
      {/* 처리한 뒤 보던 목록으로 돌아가려고 탭과 필터를 함께 보낸다 */}
      <input type="hidden" name="tab" value={view.tab} />
      <input type="hidden" name="target" value={view.target} />
      <fieldset className={styles.reviewFormFieldset} aria-describedby={error === "decision" ? "review-error" : undefined}>
        <legend className={styles.reviewFormLegend}>처리 결과</legend>
        <Choice value="dismissed" label="기각" detail={report.holdsReward ? "문제가 없어요. 보류된 보상이 지급돼요." : "문제가 없어요."} />
        <Choice value="upheld" label="인정" detail={upheldDetail} />
      </fieldset>
      {error && (
        <p id="review-error" role="alert" className={styles.reviewFormText}>
          {ERROR_MESSAGE[error]}
        </p>
      )}
      <label className={styles.reviewFormField}>
        처리 메모
        <textarea
          name="memo"
          rows={3}
          maxLength={REVIEW_MEMO_MAX_LENGTH}
          aria-describedby={error === "memo" ? "review-error" : undefined}
          placeholder={`판단 근거를 남겨 주세요 (선택, ${REVIEW_MEMO_MAX_LENGTH}자까지)`}
          className={styles.reviewFormTextarea}
        />
      </label>
      <Button type="submit" className={styles.reviewFormButton}>
        처리하기
      </Button>
    </AdminPanel>
  );
}

function Choice({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <label className={styles.choice}>
      <input type="radio" name="decision" value={value} className={styles.choiceInput} />
      <span className={styles.choiceLabel}>
        <span className={styles.choiceLabel2}>{label}</span>
        <span className={styles.choiceDetail}>{detail}</span>
      </span>
    </label>
  );
}

/** 처리한 신고. 결과는 바꿀 수 없어서 읽기만 한다 */
export function ReviewResult({ report, now }: { report: Report; now: Date }) {
  if (!report.review) return null;
  return (
    <AdminPanel as="section" aria-labelledby="review-result-heading">
      <h3 id="review-result-heading" className={styles.reviewResultTitle}>
        처리 결과
      </h3>
      <dl className={styles.reviewResultList}>
        <Info label="결과">
          <Badge tone="neutral">{REPORT_DECISION_LABEL[report.review.decision]}</Badge>
        </Info>
        <Info label="메모">{report.review.memo || "남긴 메모가 없어요"}</Info>
        <Info label="처리">
          {formatDate(report.review.processedAt)} · {formatElapsed(report.review.processedAt, now)}
        </Info>
      </dl>
    </AdminPanel>
  );
}

export function ReportDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="신고 불러오는 중" className={styles.reportDetailSkeleton}>
      <Skeleton className={styles.reportDetailSkeletonSkeleton} />
      <Skeleton className={styles.reportDetailSkeletonSkeleton2} />
      <AdminPanel data-skeleton="report-detail">
        <Skeleton className={styles.reportDetailSkeletonSkeleton3} />
        <Skeleton className={styles.reportDetailSkeletonSkeleton4} />
      </AdminPanel>
    </div>
  );
}
