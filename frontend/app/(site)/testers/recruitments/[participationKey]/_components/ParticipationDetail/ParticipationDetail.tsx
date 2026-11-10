import { isBackendAuth } from "@/lib/backend";
import { ArrowSquareOutIcon, CaretLeftIcon, ImageIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import { participationsPath } from "@/features/participation/paths";
import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { RecruitmentThumb } from "@/features/recruitment/components/RecruitmentThumb/RecruitmentThumb";
import { SELECTION_MODE_LABEL, SOFTWARE_TYPE_LABEL, type SelectionMode } from "@/features/recruitment/types";
import { cn } from "@/lib/cn";
import { daysUntil, formatCredits, formatDate, formatDateTime, formatDday } from "@/lib/format";
import {
  payoutAt,
  STATUS_LABEL,
  tabOf,
  TAB_LABEL,
  type FeedbackEntry,
  type ParticipationItem,
} from "@/features/participation/types";
import { CollapsibleText } from "../CollapsibleText/CollapsibleText";
import { FeedbackForm } from "../FeedbackForm/FeedbackForm";
import { FeedbackMarker } from "../FeedbackMarker/FeedbackMarker";
import styles from "./ParticipationDetail.module.css";

/*
 * 내 참여 상세. 위에서 아래로: 제목 줄(프로젝트 이름·상태·마감, 모집 글·테스트 열기 버튼) → 프로젝트 소개 한 줄 →
 * 썸네일 | 접속 링크와 항목 표 → 진행 상황(제출 전에는 위 제목 줄이 같은 말을 해서 뺀다) → 모집 설명 → 테스트 항목(제출 전에는 피드백을 쓰는 칸, 뒤에는 제출한 피드백).
 * 테스트 열기는 제출 전에 가장 먼저 하는 일이라 강조색 주 버튼이고, 제출 뒤에는 보조 버튼으로 내린다.
 * 프로젝트 소개, 모집 설명, 선정 방식은 참여 API에 믿을 값이 없어 공개 모집글 API에서 읽어 넘겨 받는다.
 */

type ParticipationDetailProps = {
  item: ParticipationItem;
  now: Date;
  /** 피드백을 막 제출하고 돌아왔다 */
  justSubmitted: boolean;
  /** 프로젝트 소개. 제목 줄 아래에 한 줄로 보인다. 없으면 그 줄을 그리지 않는다 */
  projectDescription: string;
  /** 모집 설명. 3줄이 넘으면 접어 둔다. 없으면 칸을 그리지 않는다 */
  recruitmentDescription: string;
  /** 선정 방식. 공개 모집글을 읽지 못했으면 없다 */
  selectionMode?: SelectionMode;
};

/** 상태마다 지금 어떤 단계인지와 다음에 일어날 일을 한 문장씩 알린다. 운영 용어(신고 사유, 제재)는 쓰지 않는다 */
function statusMessage(item: ParticipationItem, now: Date): { title: string; body: string } {
  const { recruitment } = item;
  switch (item.status) {
    case "selectionPending":
      return {
        title: "선정 결과를 기다리고 있어요",
        body: `개발자가 지원자를 직접 고르는 구독 모집이에요. 모집 마감(${formatDate(recruitment.recruitDeadline)}) 뒤에 결과를 알려 드려요.`,
      };
    case "notSelected":
      return { title: "이번 모집에는 선정되지 않았어요", body: "다른 테스트에 지원해 보세요." };
    case "beforeSubmit":
      return {
        title: `${formatDate(recruitment.submitDeadline)}까지 피드백을 제출해 주세요 (${formatDday(recruitment.submitDeadline, now)})`,
        body: "요청한 테스트를 해 보고 결과와 느낀 점을 적어 주세요. 버그를 찾지 못해도 제출하면 보상을 받아요.",
      };
    case "payoutPending":
      return {
        title: `${formatDateTime(payoutAt(item.submittedAt ?? item.appliedAt))}에 자동으로 지급돼요`,
        body: "제출 후 72시간 동안 신고가 없으면 개발자 승인 없이 크레딧이 지급돼요.",
      };
    case "underReview":
      return { title: "운영자가 제출 내용을 확인하고 있어요", body: "확인이 끝나면 지급 여부를 알려 드려요." };
    case "paid":
      return {
        title: `${formatCredits(item.earnedCredits)}을 받았어요`,
        body: `${formatDate(item.paidAt ?? item.appliedAt)}에 지급됐어요.`,
      };
    case "incomplete":
      return {
        title: "기한 안에 제출하지 않아 보상 없이 끝났어요",
        body: `피드백 제출 마감은 ${formatDate(recruitment.submitDeadline)}였어요.`,
      };
    case "excluded":
      return {
        title: "이번 참여는 보상에서 제외됐어요",
        body: `운영자 검토 결과예요. 검토는 ${formatDate(item.reviewedAt ?? item.appliedAt)}에 끝났어요.`,
      };
    case "cancelled":
      return { title: "참여가 취소됐어요", body: `${formatDate(item.cancelledAt ?? item.appliedAt)}에 취소됐어요. 다른 테스트에 지원해 보세요.` };
  }
}

/** 접속 링크의 도메인. http(s) 주소가 아니면 null이라 접속 링크와 버튼을 그리지 않는다 */
function accessHost(url: string | undefined): string | null {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

type Fact = [term: string, value: ReactNode];

/** 정보 표 왼쪽 줄: 모집 글 자체의 성격 */
function leftFacts(item: ParticipationItem, selectionMode: SelectionMode | undefined): Fact[] {
  const { recruitment } = item;
  const required = item.testItems.filter((testItem) => testItem.required).length;
  const mode = selectionMode ? SELECTION_MODE_LABEL[selectionMode] : recruitment.isSubscription ? "구독 모집" : "일반 모집";
  const facts: Fact[] = [
    ["유형", recruitment.softwareTypes.map((type) => SOFTWARE_TYPE_LABEL[type]).join(", ") || "정하지 않음"],
    ["모집 방식", mode],
  ];
  if (item.testItems.length > 0) facts.push(["테스트 항목", `${item.testItems.length}개 · 필수 ${required}개`]);
  facts.push(["지원일", formatDate(item.appliedAt)]);
  return facts;
}

/** 정보 표 오른쪽 줄: 일정과 보상. 진행에 따라 제출일·지급일이 붙는다 */
function rightFacts(item: ParticipationItem, now: Date): Fact[] {
  const { recruitment, status } = item;
  const dday = status === "beforeSubmit" ? formatDday(recruitment.submitDeadline, now) : null;
  const facts: Fact[] = [
    ["모집 마감", formatDate(recruitment.recruitDeadline)],
    [
      "제출 마감",
      <>
        {formatDate(recruitment.submitDeadline)}
        {dday && <span className={styles.dday}>{dday}</span>}
      </>,
    ],
    ["크레딧", formatCredits(recruitment.baseReward)],
  ];
  if (recruitment.extraReward !== undefined) {
    facts.push(["추가 크레딧", <span key="extra" className={styles.extra}>+{formatCredits(recruitment.extraReward)}</span>]);
  }
  if (item.submittedAt) facts.push(["제출일", formatDateTime(item.submittedAt)]);
  if (status === "payoutPending" && item.submittedAt) facts.push(["지급 예정", formatDateTime(payoutAt(item.submittedAt))]);
  if (status === "paid" && item.paidAt) facts.push(["지급일", formatDate(item.paidAt)]);
  if (status === "excluded" && item.reviewedAt) facts.push(["검토 완료", formatDate(item.reviewedAt)]);
  return facts;
}

function FactList({ facts }: { facts: Fact[] }) {
  return (
    <dl className={styles.factList}>
      {facts.map(([term, value]) => (
        <div key={term} className={styles.fact}>
          <dt className={styles.term}>{term}</dt>
          <dd className={styles.factValue}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 제출한 피드백 한 건. 항목 이름 아래에 내용과 첨부 이미지를 둔다 */
function SubmittedFeedback({ item, feedback }: { item: ParticipationItem; feedback: FeedbackEntry }) {
  const index = item.testItems.findIndex((testItem) => testItem.id === feedback.testItemId);
  const testItem = item.testItems[index];
  const title = testItem?.title ?? "기타 의견";
  const imageUrls = feedback.imageUrls ?? [];
  return (
    <li className={styles.submittedFeedback}>
      <FeedbackMarker number={testItem ? index + 1 : undefined} />
      <section aria-label={title} className={styles.submittedFeedbackSection}>
        <div className={styles.submittedFeedbackBox}>
          <h3 className={styles.submittedFeedbackTitle}>{title}</h3>
          <Badge tone={testItem?.required ? "neutral" : "outline"}>{testItem?.required ? "필수" : "선택"}</Badge>
        </div>
        {/* 줄바꿈은 지키고, 긴 URL이나 공백 없는 오류 문자열은 칸 끝에서 끊어 좁은 화면에서 넘치지 않게 한다 */}
        <p className={styles.submittedFeedbackContent}>{feedback.content}</p>
        {imageUrls.length > 0 ? (
          <div className={styles.submittedFeedbackBox2}>
            <h4 className={styles.submittedFeedbackTitle2}>
              첨부 이미지 <span className={styles.submittedFeedbackLength}>{imageUrls.length}</span>
            </h4>
            <ul className={styles.submittedFeedbackList}>
              {imageUrls.map((url, index) => (
                <li key={`${url}-${index}`}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className={styles.submittedImageLink}>
                    {/* 로그인 쿠키를 넘기려면 next/image가 아니라 브라우저 img를 쓴다 */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`${title} 첨부 이미지 ${index + 1}`} className={styles.submittedImage} />
                    <span className={styles.srOnly}> (새 탭에서 크게 보기)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : feedback.imageNames.length > 0 ? (
          <div className={styles.submittedFeedbackBox2}>
            <h4 className={styles.submittedFeedbackTitle2}>
              첨부 이미지 <span className={styles.submittedFeedbackLength}>{feedback.imageNames.length}</span>
            </h4>
            {/* 작성할 때의 미리 보기와 같은 칸. 시연용이라 파일이 없어 이미지 자리에 아이콘과 이름을 둔다 */}
            <ul data-testid="feedback-image-names" className={styles.submittedFeedbackList}>
              {feedback.imageNames.map((name, index) => (
                <li
                  key={`${name}-${index}`}
                  title={name}
                  className={styles.submittedFeedback2}
                >
                  <ImageIcon aria-hidden size={24} className={styles.submittedFeedbackIcon} />
                  <span className={styles.submittedFeedbackName}>{name}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </li>
  );
}

/** 내 참여 상세. 지금 단계와 다음 일, 모집 조건, 피드백 작성 또는 제출한 내용을 한 화면에 둔다 */
export function ParticipationDetail({ item, now, justSubmitted, projectDescription, recruitmentDescription, selectionMode }: ParticipationDetailProps) {
  const { recruitment, status } = item;
  const tab = tabOf(status);
  const message = statusMessage(item, now);
  const host = accessHost(item.accessUrl);
  const beforeSubmit = status === "beforeSubmit";
  /* 제출 전이면 마감까지 남은 날을 제목 옆에 보이고, 사흘 이하는 색 대신 굵기로 알린다(Weight-Not-Paint) */
  const dday = beforeSubmit ? formatDday(recruitment.submitDeadline, now) : null;
  const urgent = beforeSubmit && daysUntil(recruitment.submitDeadline, now) <= 3;

  return (
    <div className={styles.root}>
      <Link href={participationsPath(tab)} className={styles.link}>
        <CaretLeftIcon aria-hidden size={16} weight="bold" />
        {TAB_LABEL[tab]}
      </Link>

      {justSubmitted && status === "payoutPending" && (
        <p role="status" className={styles.text}>
          {isBackendAuth ? "피드백을 제출했어요." : "피드백을 제출했어요. 시연용이라 이 브라우저에만 남아요."}
        </p>
      )}

      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.titleBox}>
            <div className={styles.titleLine}>
              <h1 className={styles.projectName}>{recruitment.projectName}</h1>
              <div className={styles.badges}>
                <Badge>{STATUS_LABEL[status]}</Badge>
                {recruitment.isSubscription && <Badge tone="muted">구독 모집</Badge>}
                {dday && <span className={cn(styles.deadline, urgent && styles.deadlineUrgent)}>마감 {dday}</span>}
              </div>
            </div>
            {projectDescription && <p className={styles.summary}>{projectDescription}</p>}
          </div>
          <div className={styles.actions}>
            {/* 취소된 모집은 공개 상세가 없다 */}
            {!item.recruitmentCancelled && (
              <LinkButton href={`/recruitments/${recruitment.slug}`} variant="secondary" className={styles.action}>
                모집 글
              </LinkButton>
            )}
            {host && (
              <LinkButton
                href={item.accessUrl as string}
                target="_blank"
                rel="noopener noreferrer"
                variant={beforeSubmit ? "primary" : "secondary"}
                className={styles.action}
              >
                테스트 열기
                <ArrowSquareOutIcon aria-hidden size={18} weight="bold" />
                <span className={styles.srOnly}> (새 탭)</span>
              </LinkButton>
            )}
          </div>
        </div>

        <div className={styles.info}>
          {/* 이름은 제목에 있으니 썸네일은 보조 기술에서 숨긴다. 지급 완료는 상태 배지로도 읽힌다 */}
          <div aria-hidden className={styles.thumb}>
            <RecruitmentThumb recruitment={recruitment} stamp={status === "paid" ? "지급 완료" : undefined} />
          </div>
          <Card as="section" aria-labelledby="info-heading" className={styles.infoCard}>
            <h2 id="info-heading" className={styles.srOnly}>
              테스트 정보
            </h2>
            {host && (
              <a href={item.accessUrl} target="_blank" rel="noopener noreferrer" className={styles.accessLink}>
                {item.accessUrl}
                <span className={styles.srOnly}> (새 탭)</span>
              </a>
            )}
            <div className={styles.facts}>
              <FactList facts={leftFacts(item, selectionMode)} />
              <FactList facts={rightFacts(item, now)} />
            </div>
          </Card>
        </div>
      </header>

      {/* 제출 전에는 제목 줄의 "마감 D-n"과 아래 테스트 항목 안내가 같은 말이라 진행 상황을 빼고, 다른 단계에서만 보인다 */}
      {!beforeSubmit && (
        <section aria-labelledby="status-heading" className={styles.section}>
          <h2 id="status-heading" className={styles.sectionTitle}>
            진행 상황
          </h2>
          <p className={styles.title2}>{message.title}</p>
          <p className={styles.body}>{message.body}</p>
          {status === "notSelected" && (
            <LinkButton href="/recruitments" variant="secondary" size="sm" className={styles.button2}>
              테스트 둘러보기
            </LinkButton>
          )}
        </section>
      )}

      {recruitmentDescription && (
        <section aria-labelledby="description-heading" className={styles.section}>
          <h2 id="description-heading" className={styles.sectionTitle}>
            모집 설명
          </h2>
          <Card className={styles.card}>
            <CollapsibleText text={recruitmentDescription} />
          </Card>
        </section>
      )}

      {beforeSubmit && (
        <section aria-labelledby="items-heading" className={styles.section}>
          <h2 id="items-heading" className={styles.sectionTitle}>
            테스트 항목
          </h2>
          <Card className={styles.card}>
            <FeedbackForm participationKey={item.key} testItems={item.testItems} uploadEnabled={isBackendAuth} />
          </Card>
        </section>
      )}

      {item.feedbacks.length > 0 && (
        <section aria-labelledby="submitted-heading" className={styles.section}>
          <h2 id="submitted-heading" className={styles.sectionTitle}>
            제출한 피드백
          </h2>
          <Card className={styles.card}>
            <ol className={styles.list2}>
              {item.feedbacks.map((feedback) => (
                <SubmittedFeedback key={feedback.testItemId ?? "other"} item={item} feedback={feedback} />
              ))}
            </ol>
          </Card>
        </section>
      )}
    </div>
  );
}

export function ParticipationDetailSkeleton() {
  return (
    <div data-skeleton="detail" aria-busy="true" aria-label="참여 내역 불러오는 중" className={styles.participationDetailSkeleton}>
      <Skeleton className={styles.participationDetailSkeletonSkeleton} />
      <div className={styles.participationDetailSkeletonBox}>
        <Skeleton className={styles.participationDetailSkeletonSkeleton2} />
        <div className={styles.participationDetailSkeletonBox2}>
          <Skeleton className={styles.participationDetailSkeletonSkeleton3} />
          <Skeleton className={styles.participationDetailSkeletonSkeleton4} />
          <Skeleton className={styles.participationDetailSkeletonSkeleton5} />
        </div>
      </div>
      <Skeleton className={styles.participationDetailSkeletonSkeleton6} />
    </div>
  );
}
