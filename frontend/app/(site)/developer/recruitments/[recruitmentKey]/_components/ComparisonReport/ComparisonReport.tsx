"use client";

import { SparkleIcon } from "@phosphor-icons/react";
import { unstable_rethrow } from "next/navigation";
import { type ReactNode, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { formatDateTime } from "@/lib/format";
import { getFollowupQuestions } from "@/features/recruitment/actions";
import { REVIEW_CATEGORY_LABEL, type ComparisonGroup, type GroupReview } from "@/features/recruitment/types";
import { FollowupQuestionsDialog, type FollowupState } from "../FollowupQuestionsDialog/FollowupQuestionsDialog";
import { SeverityTag } from "../SeverityTag/SeverityTag";
import styles from "./ComparisonReport.module.css";

/*
 * 버전 별 분석의 레포트. "레포트" 소제목 아래 왼쪽에 이번 버전 그룹 목록(순위·심각도·이름·이어짐 딱지), 오른쪽에 고른 그룹의 보고서를 둔다.
 * 리뷰 분석 탭처럼 넓은 화면에서는 목록이 스크롤을 따라 내려온다.
 * 보고서는 한 장의 문서처럼 문서 머리 → 01 리뷰 수 변화 → 02 대표 리뷰(v1 → v2, 리뷰마다 AI 질문 3개, 하루 3번) → 03 리뷰 목록 순서다.
 * 이어진 직전 그룹은 보여 주기만 한다. 짝은 그룹 전체 목록에서 고쳐 저장한다.
 */

const FOLLOWUP_NETWORK_ERROR = "연결이 불안정해 질문을 받지 못했어요. 잠시 후 다시 시도해 주세요";

type ComparisonReportProps = {
  /** 두 버전에 걸친 그룹. 레포트는 이번 버전에 있는 그룹만 쓴다 */
  groups: ComparisonGroup[];
  /** 직전·이번 버전 모집 건 키. AI 질문은 리뷰가 속한 모집 건으로 요청한다 */
  previousKey: string;
  currentKey: string;
  previousVersion: number;
  currentVersion: number;
};

/** 질문을 받는 리뷰와 그 리뷰가 속한 모집 건 */
type Asking = { review: GroupReview; recruitmentKey: string };

const representativeOf = (reviews: GroupReview[] | undefined) => reviews?.find((item) => item.representative) ?? reviews?.[0] ?? null;

/** 움직임 줄이기를 켠 사람에게는 부드럽게 굴리지 않는다 */
const scrollBehavior = (): ScrollBehavior => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

export function ComparisonReport({ groups, previousKey, currentKey, previousVersion, currentVersion }: ComparisonReportProps) {
  /* 받은 순서가 심각도·테스터 수 순이라 이번 버전 그룹의 순서가 곧 순위다 */
  const reported = groups.filter((group) => group.current);
  const [selectedId, setSelectedId] = useState(reported[0]?.current?.id);
  const [asking, setAsking] = useState<Asking | null>(null);
  const [followups, setFollowups] = useState<Record<string, FollowupState>>({});
  const reportRef = useRef<HTMLDivElement>(null);
  const selected = reported.find((group) => group.current?.id === selectedId) ?? reported[0];

  if (!selected) {
    return (
      <section aria-labelledby="comparison-report-heading" className={styles.section}>
        <h2 id="comparison-report-heading" className={styles.title}>
          레포트
        </h2>
        <Card as="p" className={styles.empty}>
          이번 버전에 묶인 리뷰 그룹이 없어요
        </Card>
      </section>
    );
  }

  /** 그룹을 고른다. 좁은 화면에서는 레포트가 목록 아래에 있어서 그쪽으로 내려간다 */
  function select(id: string) {
    setSelectedId(id);
    if (!window.matchMedia("(min-width: 64rem)").matches) {
      requestAnimationFrame(() => reportRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "start" }));
    }
  }

  /** 하루 3번 한도가 있어서 이미 받았거나 받는 중이면 다시 요청하지 않는다. 실패했으면 다시 요청한다 */
  async function askFollowup(review: GroupReview, recruitmentKey: string) {
    setAsking({ review, recruitmentKey });
    const current = followups[review.id];
    if (current && current.state !== "error") return;
    setFollowups((prev) => ({ ...prev, [review.id]: { state: "loading" } }));
    let next: FollowupState;
    try {
      const result = await getFollowupQuestions(recruitmentKey, review.id);
      next = result.ok ? { state: "done", questions: result.questions } : { state: "error", message: result.message };
    } catch (caught) {
      unstable_rethrow(caught);
      next = { state: "error", message: FOLLOWUP_NETWORK_ERROR };
    }
    setFollowups((prev) => ({ ...prev, [review.id]: next }));
  }

  return (
    /* 레포트 소제목 아래에 그룹 목록(왼쪽)과 고른 그룹의 보고서(오른쪽)를 함께 둔다 */
    <section aria-labelledby="comparison-report-heading" className={styles.section}>
      <div className={styles.head}>
        <h2 id="comparison-report-heading" className={styles.title}>
          레포트
        </h2>
        <p className={styles.note}>v{currentVersion} 그룹 · 심각도 순</p>
      </div>
      <div className={styles.layout}>
        <Card as="ul" aria-label={`v${currentVersion} 그룹 목록`} className={styles.list}>
          {reported.map((group, index) => {
            const id = group.current?.id ?? group.code;
            const isSelected = group === selected;
            return (
              <li key={id} data-selected={isSelected} className={styles.item}>
                <button type="button" aria-pressed={isSelected} onClick={() => select(id)} className={styles.itemSelect}>
                  <span className={styles.rank}>{index + 1}</span>
                  <SeverityTag severity={group.severity} />
                  <span className={styles.itemName}>{group.name}</span>
                  <span data-status={group.status} className={styles.badge}>
                    {group.status === "continued" ? `v${previousVersion}부터 계속` : "새로 생김"}
                  </span>
                </button>
              </li>
            );
          })}
        </Card>

        <div ref={reportRef} className={styles.report}>
          <Report
            key={selected.current?.id}
            group={selected}
            rank={reported.indexOf(selected) + 1}
            previousVersion={previousVersion}
            currentVersion={currentVersion}
            onAsk={(review, side) => askFollowup(review, side === "previous" ? previousKey : currentKey)}
          />
        </div>
      </div>

      {asking && (
        <FollowupQuestionsDialog
          key={asking.review.id}
          nickname={asking.review.testerNickname}
          content={asking.review.content}
          followup={followups[asking.review.id] ?? { state: "loading" }}
          onRetry={() => askFollowup(asking.review, asking.recruitmentKey)}
          onClose={() => setAsking(null)}
        />
      )}
    </section>
  );
}

type ReportProps = {
  group: ComparisonGroup;
  rank: number;
  previousVersion: number;
  currentVersion: number;
  onAsk: (review: GroupReview, side: "previous" | "current") => void;
};

/** 보고서의 번호 붙은 절: 01 제목 (오른쪽에 덧붙임) → 내용 */
function ReportSection({ index, id, title, aside, children }: { index: number; id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={styles.paperSection}>
      <div className={styles.paperSectionHead}>
        <h4 id={id} className={styles.paperSectionTitle}>
          <span aria-hidden="true" className={styles.paperIndex}>
            {String(index).padStart(2, "0")}
          </span>
          {title}
        </h4>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** 고른 그룹 보고서: 문서 머리(이름표·순위·제목·이어진 그룹) → 01 리뷰 수 변화 → 02 대표 리뷰(v1 → v2) → 03 리뷰 목록 */
function Report({ group, rank, previousVersion, currentVersion, onAsk }: ReportProps) {
  const previousReviews = group.previous?.reviews ?? [];
  const currentReviews = group.current?.reviews ?? [];
  const delta = currentReviews.length - previousReviews.length;
  const scale = Math.max(previousReviews.length, currentReviews.length, 1);
  const before = `v${previousVersion}`;
  const after = `v${currentVersion}`;
  const bars = [
    { key: "previous", label: `${before} 이전`, count: previousReviews.length, testers: group.previous?.testerCount ?? 0 },
    { key: "current", label: `${after} 이번`, count: currentReviews.length, testers: group.current?.testerCount ?? 0 },
  ];

  return (
    <Card as="article" aria-labelledby="comparison-report-title" data-status={group.status} className={styles.paper}>
      <header className={styles.paperHead}>
        {/* 문서 이름표: 굵은 선 위에 보고서 종류와 견준 버전 */}
        <p className={styles.docLabel}>
          <span>그룹 레포트</span>
          <span>
            {before} → {after} 비교
          </span>
        </p>
        <p className={styles.eyebrow}>
          <span className={styles.reportRank}>{rank}위</span>
          <SeverityTag severity={group.severity} />
          <span className={styles.category}>{REVIEW_CATEGORY_LABEL[group.category]}</span>
        </p>
        <h3 id="comparison-report-title" className={styles.reportTitle}>
          {group.name}
        </h3>
        {/* 문서의 항목 줄: 이어진 직전 그룹. 짝은 그룹 전체 목록에서 고친다 */}
        <dl className={styles.link}>
          <dt className={styles.linkLabel}>{before}에서 이어진 그룹</dt>
          <dd className={group.previous ? styles.linkValue : styles.linkNone}>{group.previous?.name ?? "없음 (새로 생긴 그룹)"}</dd>
        </dl>
      </header>

      <ReportSection
        index={1}
        id="comparison-change-heading"
        title="리뷰 수 변화"
        aside={<p className={delta > 0 ? styles.deltaUp : delta < 0 ? styles.deltaDown : styles.delta}>{delta > 0 ? `+${delta}` : delta}건</p>}
      >
        <dl className={styles.bars}>
          {bars.map((bar) => (
            <div key={bar.key} data-side={bar.key} className={styles.bar}>
              <dt className={styles.barLabel}>{bar.label}</dt>
              <dd className={styles.barValue}>
                <span aria-hidden="true" className={styles.track}>
                  <span className={styles.fill} style={{ width: `${(bar.count / scale) * 100}%` }} />
                </span>
                <span className={styles.barCount}>
                  {bar.count}건<span className={styles.barTesters}> · 테스터 {bar.testers}명</span>
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </ReportSection>

      <ReportSection index={2} id="comparison-representative-heading" title="대표 리뷰">
        {/* 이전에서 이번으로 읽는 순서라 타임라인처럼 위에서 아래로 잇는다 */}
        <ol className={styles.timeline}>
          <Representative
            version={`${before} 이전`}
            review={representativeOf(group.previous?.reviews)}
            empty="직전 버전에는 없던 그룹이에요"
            onAsk={(review) => onAsk(review, "previous")}
          />
          <Representative
            version={`${after} 이번`}
            review={representativeOf(group.current?.reviews)}
            empty="이번 버전에서는 리뷰가 들어오지 않았어요"
            current
            onAsk={(review) => onAsk(review, "current")}
          />
        </ol>
      </ReportSection>

      <ReportSection index={3} id="comparison-reviews-heading" title="리뷰 목록">
        <ReviewList version={`${after} 이번`} reviews={currentReviews} />
        <ReviewList version={`${before} 이전`} reviews={previousReviews} />
      </ReportSection>
    </Card>
  );
}

function ReviewMeta({ review }: { review: GroupReview }) {
  return (
    <p className={styles.reviewMeta}>
      <strong className={styles.nickname}>{review.testerNickname}</strong>
      <span>{review.testItemTitle ?? "기타 의견"}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={review.submittedAt}>{formatDateTime(review.submittedAt)}</time>
    </p>
  );
}

type RepresentativeProps = {
  version: string;
  review: GroupReview | null;
  /** 그 버전에 이 그룹이 없을 때 문구 */
  empty: string;
  current?: boolean;
  onAsk: (review: GroupReview) => void;
};

/** 타임라인의 한 칸: 버전 표시 옆 상자에 리뷰 정보 → 리뷰 내용 → AI 질문 버튼 */
function Representative({ version, review, empty, current = false, onAsk }: RepresentativeProps) {
  return (
    <li data-current={current} className={styles.step}>
      <span aria-hidden="true" className={styles.stepMarker} />
      <div className={styles.stepBody}>
        <p className={styles.stepVersion}>{version}</p>
        {review ? (
          <div className={styles.quote}>
            <ReviewMeta review={review} />
            <blockquote className={styles.quoteText}>{review.content}</blockquote>
            <Button
              size="sm"
              variant="secondary"
              aria-label={`${version} 대표 리뷰(${review.testerNickname}님)로 AI 질문 3개 받기`}
              onClick={() => onAsk(review)}
              className={styles.askButton}
            >
              <SparkleIcon aria-hidden="true" weight="fill" />
              AI 질문 3개
            </Button>
          </div>
        ) : (
          <p className={styles.stepEmpty}>{empty}</p>
        )}
      </div>
    </li>
  );
}

/** 한 버전의 리뷰 목록: 버전 이름과 오른쪽에 건수, 아래 목록. 비어 있으면 그리지 않는다 */
function ReviewList({ version, reviews }: { version: string; reviews: GroupReview[] }) {
  if (reviews.length === 0) return null;
  return (
    <div className={styles.versionReviews}>
      <div className={styles.versionHead}>
        <p className={styles.versionLabel}>{version}</p>
        <p className={styles.versionCount}>{reviews.length}건</p>
      </div>
      <ul className={styles.reviews}>
        {reviews.map((review) => (
          <li key={review.id} className={styles.review}>
            <ReviewMeta review={review} />
            <p className={styles.reviewContent}>{review.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
