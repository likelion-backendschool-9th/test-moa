"use client";

import { ChatsIcon, FlagIcon, HeartIcon, SparkleIcon } from "@phosphor-icons/react";
import { unstable_rethrow } from "next/navigation";
import { type ReactNode, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { formatDate } from "@/lib/format";
import { getFollowupQuestions } from "../../../../../../features/project/actions";
import type { FeedbackView } from "../../../../../../features/project/service";
import type { FeedbackStatus, TestItem } from "../../../../../../features/project/types";
import { CHAT_NOT_READY, FollowupQuestionsDialog, type FollowupState } from "./FollowupQuestionsDialog";
import { inputClass } from "../../../../../../components/ui/TextField";

/*
 * 피드백 탭. 피드백마다 어느 테스트 항목에 대한 것인지(없으면 기타 의견)와 붙인 스크린샷을 보여 준다.
 * 카드 아래 버튼 줄은 언제나 4개다: 채팅하기, AI 질문 받기(둘은 유료 기능), 유용해요(예전 "추천"), 신고.
 * - 상태 배지 대신 신고 버튼이 상태를 보여 준다. 신고했으면 "신고 정보", 아니면 "신고하기"다.
 *   신고하기는 제출 후 72시간 안에만 대화상자를 열고, 지난 피드백은 신고 기간이 지났다고 안내한다.
 * - 무료 모집에서는 채팅하기·AI 질문 받기가 구독 안내로 이어진다.
 * - 채팅방 생성, 추천 저장, 신고, 신고 정보 조회는 백엔드 API가 아직 없다. 추천과 신고는 화면에서만 바뀌고 새로고침하면 돌아오며,
 *   채팅하기와 신고 정보는 준비 중 안내만 보여 준다.
 * 대화상자는 기본 dialog를 써서 Esc 닫기와 포커스 복귀를 브라우저에 맡긴다.
 */

const SUBSCRIPTION_PATH = "/my/subscription";
const REPORT_INFO_NOT_READY = "신고 정보는 준비 중이에요";
/* README: 제출 후 72시간 동안 신고가 없으면 자동 지급되고, 그 뒤에는 신고할 수 없다 */
const REPORT_CLOSED = "신고는 제출 후 72시간 안에만 할 수 있어요";
const FOLLOWUP_NETWORK_ERROR = "연결이 불안정해 질문을 받지 못했어요. 잠시 후 다시 시도해 주세요";

const icon = { "aria-hidden": true, size: 16, weight: "bold" } as const;
/* 다크에서는 흰 글씨가 무거워 보여 카드 버튼 4개만 굵기를 보통으로 낮춘다 */
const CARD_ACTION = "dark:font-normal";

type FeedbackListProps = {
  feedbacks: FeedbackView[];
  testItems: TestItem[];
  recruitmentKey: string;
  /** 구독 모집이면 채팅하기·AI 질문 받기를 바로 쓴다 */
  isSubscription: boolean;
};

/** 피드백 목록과 신고·AI 질문 대화상자 */
export function FeedbackList({ feedbacks, testItems, recruitmentKey, isSubscription }: FeedbackListProps) {
  const [statuses, setStatuses] = useState<Record<string, FeedbackStatus>>({});
  const [recommended, setRecommended] = useState<Record<string, boolean>>({});
  /** 버튼을 눌렀지만 API가 없을 때 카드에 보여 줄 안내 */
  const [notices, setNotices] = useState<Record<string, string>>({});
  const [followups, setFollowups] = useState<Record<string, FollowupState>>({});
  const [asking, setAsking] = useState<FeedbackView | null>(null);
  const [target, setTarget] = useState<FeedbackView | null>(null);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  function toggleRecommend(feedback: FeedbackView, next: boolean) {
    setRecommended((prev) => ({ ...prev, [feedback.id]: next }));
    setAnnouncement(`${feedback.testerNickname}님의 피드백${next ? "을 유용해요로 표시했어요" : "에서 유용해요를 뺐어요"}`);
  }

  function showNotice(feedback: FeedbackView, text: string) {
    setNotices((prev) => ({ ...prev, [feedback.id]: text }));
    setAnnouncement(text);
  }

  /** 하루 3번 한도가 있어서 이미 받았거나 받는 중이면 다시 요청하지 않는다. 실패했으면 다시 요청한다 */
  async function askFollowup(feedback: FeedbackView) {
    setAsking(feedback);
    const current = followups[feedback.id];
    if (current && current.state !== "error") return;
    setFollowups((prev) => ({ ...prev, [feedback.id]: { state: "loading" } }));
    let next: FollowupState;
    try {
      const result = await getFollowupQuestions(recruitmentKey, feedback.id);
      next = result.ok ? { state: "done", questions: result.questions } : { state: "error", message: result.message };
    } catch (caught) {
      unstable_rethrow(caught);
      next = { state: "error", message: FOLLOWUP_NETWORK_ERROR };
    }
    setFollowups((prev) => ({ ...prev, [feedback.id]: next }));
  }

  function openReport(feedback: FeedbackView) {
    setTarget(feedback);
    setError("");
    dialogRef.current?.showModal();
  }

  function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    if (!reason) {
      setError("신고 사유를 적어 주세요");
      return;
    }
    if (!target) return;
    setStatuses((prev) => ({ ...prev, [target.id]: "reported" }));
    setAnnouncement(`${target.testerNickname}님의 피드백을 신고했어요`);
    event.currentTarget.reset();
    dialogRef.current?.close();
  }

  if (feedbacks.length === 0) return <EmptyState title="아직 제출된 피드백이 없어요" />;

  const itemTitle = (id: string | null) => testItems.find((item) => item.id === id)?.title ?? "기타 의견";
  /* 항목별 피드백 수. 기타 의견은 있을 때만 센다 */
  const byItem = [
    ...testItems.map((item) => [item.title, feedbacks.filter((feedback) => feedback.testItemId === item.id).length] as const),
    ["기타 의견", feedbacks.filter((feedback) => !testItems.some((item) => item.id === feedback.testItemId)).length] as const,
  ].filter(([title, count]) => title !== "기타 의견" || count > 0);
  const isRecommended = (item: FeedbackView) => recommended[item.id] ?? item.recommended;
  const recommendedCount = feedbacks.filter(isRecommended).length;

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <p data-testid="feedback-by-item" className="text-sm text-text-muted">
        항목별 {byItem.map(([title, count]) => `${title} ${count}건`).join(" · ")}
        <span data-testid="recommended-count"> · 유용해요 {recommendedCount}건</span>
      </p>
      <ul className="flex flex-col gap-3">
        {feedbacks.map((item) => {
          const status = statuses[item.id] ?? item.status;
          const liked = isRecommended(item);
          const nickname = item.testerNickname;
          return (
            <li key={item.id} data-testid="feedback" className="flex flex-col gap-4 rounded-2xl bg-surface-muted p-5 md:p-6">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{nickname}</span>
                  <Badge tone="neutral">{itemTitle(item.testItemId)}</Badge>
                </div>
                <p className="text-xs text-text-muted">
                  {formatDate(item.submittedAt)} 제출
                  {status === "waiting" && ` · ${item.hoursUntilPaid}시간 뒤 자동 지급`}
                </p>
              </div>
              <p className="text-sm">{item.content}</p>
              {item.images.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {item.images.map((image) => (
                    <li key={image.url}>
                      <a href={image.url} target="_blank" rel="noopener noreferrer" className="block w-40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
                          alt={image.name}
                          className="aspect-video w-full rounded-xl border border-line bg-surface-strong object-cover"
                        />
                        <span className="sr-only"> (새 탭에서 크게 보기)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center justify-end gap-2">
                {notices[item.id] && <p className="mr-auto text-sm text-text-muted">{notices[item.id]}</p>}
                <PaidAction subscribed={isSubscription} label={`${nickname}님과 채팅하기`} onClick={() => showNotice(item, CHAT_NOT_READY)}>
                  <ChatsIcon {...icon} />
                  채팅하기
                </PaidAction>
                <PaidAction subscribed={isSubscription} label={`${nickname}님 피드백으로 AI 질문 받기`} onClick={() => askFollowup(item)}>
                  <SparkleIcon {...icon} />
                  AI 질문 받기
                </PaidAction>
                <Button
                  size="sm"
                  variant={liked ? "like" : "secondary"}
                  className={CARD_ACTION}
                  aria-pressed={liked}
                  aria-label={`${nickname}님의 피드백이 유용해요`}
                  onClick={() => toggleRecommend(item, !liked)}
                >
                  {/* 이번에 직접 누른 하트만 튀어 오른다. 처음부터 눌려 있던 피드백은 그냥 보인다 */}
                  <HeartIcon {...icon} weight={liked ? "fill" : "bold"} className={recommended[item.id] ? "animate-heart-pop" : undefined} />
                  유용해요
                </Button>
                {status === "reported" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className={CARD_ACTION}
                    aria-label={`${nickname}님의 피드백 신고 정보`}
                    onClick={() => showNotice(item, REPORT_INFO_NOT_READY)}
                  >
                    {/* 신고한 피드백은 깃발을 채워 신고하기와 구분한다 */}
                    <FlagIcon {...icon} weight="fill" />
                    신고 정보
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className={CARD_ACTION}
                    aria-label={`${nickname}님의 피드백 신고하기`}
                    onClick={() => (status === "waiting" && item.hoursUntilPaid > 0 ? openReport(item) : showNotice(item, REPORT_CLOSED))}
                  >
                    <FlagIcon {...icon} />
                    신고하기
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {asking && (
        <FollowupQuestionsDialog
          key={asking.id}
          nickname={asking.testerNickname}
          content={asking.content}
          followup={followups[asking.id] ?? { state: "loading" }}
          onRetry={() => askFollowup(asking)}
          onClose={() => setAsking(null)}
        />
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="report-title"
        className="m-auto w-full max-w-md rounded-2xl bg-surface-muted p-6 text-text backdrop:bg-text/50"
      >
        <form onSubmit={submitReport} noValidate className="flex flex-col gap-4">
          <h2 id="report-title" className="text-lg font-extrabold">
            피드백 신고
          </h2>
          <p className="text-sm text-text-muted">
            {target?.testerNickname}님의 피드백을 신고해요. 운영자가 검토하고, 그동안 보상 지급은 멈춰요.
          </p>
          <label htmlFor="report-reason" className="text-sm font-bold">
            신고 사유
          </label>
          <textarea
            id="report-reason"
            name="reason"
            rows={4}
            maxLength={500}
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "report-reason-error" : undefined}
            className={inputClass}
          />
          {error && (
            <p id="report-reason-error" className="text-sm font-semibold">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
              취소
            </Button>
            <Button type="submit">신고하기</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** 유료 기능 버튼. 구독 모집이면 바로 쓰고, 무료 모집이면 구독 안내로 간다 */
function PaidAction({ subscribed, label, onClick, children }: { subscribed: boolean; label: string; onClick: () => void; children: ReactNode }) {
  if (!subscribed) {
    return (
      <LinkButton href={SUBSCRIPTION_PATH} size="sm" variant="paid" className={CARD_ACTION} aria-label={`${label}, 구독하면 쓸 수 있어요`}>
        {children}
      </LinkButton>
    );
  }
  return (
    <Button size="sm" variant="paid" className={CARD_ACTION} aria-label={label} onClick={onClick}>
      {children}
    </Button>
  );
}
