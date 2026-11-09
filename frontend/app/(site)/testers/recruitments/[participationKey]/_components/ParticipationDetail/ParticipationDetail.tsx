import { isBackendAuth } from "@/lib/backend";
import { ImageIcon } from "@phosphor-icons/react/ssr";
import { CaretLeftIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import { participationsPath } from "@/features/participation/paths";
import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { RecruitmentThumb } from "@/features/recruitment/components/RecruitmentThumb/RecruitmentThumb";
import { formatCredits, formatDate, formatDateTime, formatDday } from "@/lib/format";
import {
  payoutAt,
  STATUS_LABEL,
  tabOf,
  TAB_LABEL,
  type FeedbackEntry,
  type ParticipationItem,
} from "@/features/participation/types";
import { FeedbackForm } from "../FeedbackForm/FeedbackForm";
import { FeedbackMarker } from "../FeedbackMarker/FeedbackMarker";
import styles from "./ParticipationDetail.module.css";

type ParticipationDetailProps = {
  item: ParticipationItem;
  now: Date;
  /** 피드백을 막 제출하고 돌아왔다 */
  justSubmitted: boolean;
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

/** 제목 아래 테스트 정보. 마감일·보상은 모집 글의 값이고, 진행에 따라 제출일·지급일이 붙는다 */
function infoRows(item: ParticipationItem): Array<[string, ReactNode]> {
  const { recruitment } = item;
  const rows: Array<[string, ReactNode]> = [
    ["모집 마감", formatDate(recruitment.recruitDeadline)],
    ["피드백 제출 마감", formatDate(recruitment.submitDeadline)],
    ["기본 보상", formatCredits(recruitment.baseReward)],
  ];
  if (recruitment.extraReward !== undefined) {
    rows.push(["추가 보상", <span key="extra" className={styles.infoRows}>+{formatCredits(recruitment.extraReward)}</span>]);
  }
  if (item.accessUrl) {
    rows.push([
      "테스트 접속",
      <a key="access" href={item.accessUrl} target="_blank" rel="noopener noreferrer" className={styles.accessLink}>
        바로 가기<span className={styles.srOnly}> (새 탭)</span>
      </a>,
    ]);
  }
  rows.push(["지원일", formatDate(item.appliedAt)]);
  if (item.submittedAt) rows.push(["제출일", formatDateTime(item.submittedAt)]);
  if (item.status === "payoutPending" && item.submittedAt) rows.push(["지급 예정", formatDateTime(payoutAt(item.submittedAt))]);
  if (item.status === "paid" && item.paidAt) rows.push(["지급일", formatDate(item.paidAt)]);
  if (item.status === "excluded" && item.reviewedAt) rows.push(["검토 완료", formatDate(item.reviewedAt)]);
  return rows;
}

/** 제출한 피드백 한 건. 항목 이름 아래에 내용과 첨부 이미지를 둔다 */
function SubmittedFeedback({ item, feedback }: { item: ParticipationItem; feedback: FeedbackEntry }) {
  const index = item.testItems.findIndex((testItem) => testItem.id === feedback.testItemId);
  const testItem = item.testItems[index];
  const title = testItem?.title ?? "기타 의견";
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
        {feedback.imageNames.length > 0 && (
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
        )}
      </section>
    </li>
  );
}

/** 내 참여 상세. 지금 단계와 다음 일, 피드백 작성 또는 제출한 내용, 모집 정보를 한 화면에 둔다 */
export function ParticipationDetail({ item, now, justSubmitted }: ParticipationDetailProps) {
  const { recruitment, status } = item;
  const tab = tabOf(status);
  const message = statusMessage(item, now);

  /* 한 건을 읽고 쓰는 화면이라 넓은 화면에서도 가운데 한 칸에 모은다 */
  return (
    <div className={styles.root}>
      <Link
        href={participationsPath(tab)}
        className={styles.link}
      >
        <CaretLeftIcon aria-hidden size={16} weight="bold" />
        {TAB_LABEL[tab]}
      </Link>

      {justSubmitted && status === "payoutPending" && (
        <p role="status" className={styles.text}>
          {isBackendAuth ? "피드백을 제출했어요." : "피드백을 제출했어요. 시연용이라 이 브라우저에만 남아요."}
        </p>
      )}

      <header className={styles.header}>
        {/* 이름은 제목에 있으니 썸네일은 보조 기술에서 숨긴다. 지급 완료는 상태 배지로도 읽힌다 */}
        <div aria-hidden className={styles.box}>
          <RecruitmentThumb recruitment={recruitment} stamp={status === "paid" ? "지급 완료" : undefined} />
        </div>
        <div className={styles.box2}>
          <div className={styles.box3}>
            <div className={styles.box4}>
              <h1 className={styles.projectName}>{recruitment.projectName}</h1>
              <p className={styles.text2}>
                <Badge>{STATUS_LABEL[status]}</Badge>
                {recruitment.isSubscription && <Badge tone="muted">구독 모집</Badge>}
              </p>
            </div>
            <p className={styles.request}>{recruitment.request}</p>
          </div>
          {/* 테스트 정보는 이 모집 글에 대한 것이라 제목 바로 아래, 목록 행과 같은 모양으로 둔다 */}
          <section aria-labelledby="info-heading">
            <h2 id="info-heading" className={styles.srOnly}>
              테스트 정보
            </h2>
            <dl className={styles.list}>
              {infoRows(item).map(([label, value]) => (
                <div key={label}>
                  <dt className={styles.label}>{label}</dt>
                  <dd className={styles.value}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </header>

      <div className={styles.box5}>
        <section aria-labelledby="status-heading" className={styles.section}>
          <h2 id="status-heading" className={styles.title}>
            진행 상황
          </h2>
          <p className={styles.title2}>{message.title}</p>
          {/* 이 참여가 가리키는 모집 글은 설명 문장과 같은 줄 오른쪽에 둔다. 좁은 화면에서는 문장 아래로 내려간다 */}
          <div className={styles.box6}>
            <p className={styles.body}>{message.body}</p>
            <LinkButton href={`/recruitments/${recruitment.slug}`} variant="secondary" size="sm" className={styles.button}>
              모집 글 보기
            </LinkButton>
          </div>
          {status === "notSelected" && (
            <LinkButton href="/recruitments" variant="secondary" size="sm" className={styles.button2}>
              테스트 둘러보기
            </LinkButton>
          )}
        </section>

        {status === "beforeSubmit" && (
          <Card className={styles.card}>
            <h2 className={styles.title3}>피드백 쓰기</h2>
            <FeedbackForm participationKey={item.key} testItems={item.testItems} />
          </Card>
        )}

        {item.feedbacks.length > 0 && (
          <Card className={styles.card2}>
            <h2 className={styles.title4}>제출한 피드백</h2>
            <ol className={styles.list2}>
              {item.feedbacks.map((feedback) => (
                <SubmittedFeedback key={feedback.testItemId ?? "other"} item={item} feedback={feedback} />
              ))}
            </ol>
          </Card>
        )}
      </div>
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
