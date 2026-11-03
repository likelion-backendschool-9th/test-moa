"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import type { FeedbackView } from "../service";
import { FEEDBACK_STATUS_LABEL, type FeedbackStatus, type TestItem } from "../types";
import { inputClass } from "./TextField";

/*
 * 피드백 탭. 신고 대기 중인 피드백은 72시간 안에 사유를 적어 신고할 수 있다.
 * 피드백마다 어느 테스트 항목에 대한 것인지(없으면 기타 의견)와 붙인 스크린샷을 보여 준다.
 * 도움이 된 피드백은 "추천"으로 표시한다. 신고된 피드백은 추천할 수 없다.
 * 목업이라 신고와 추천은 화면에서만 바뀌고 새로고침하면 돌아온다.
 * 대화상자는 기본 dialog를 써서 Esc 닫기와 포커스 복귀를 브라우저에 맡긴다.
 */

/** 피드백 목록과 신고 대화상자 */
export function FeedbackList({ feedbacks, testItems }: { feedbacks: FeedbackView[]; testItems: TestItem[] }) {
  const [statuses, setStatuses] = useState<Record<string, FeedbackStatus>>({});
  const [recommended, setRecommended] = useState<Record<string, boolean>>({});
  const [target, setTarget] = useState<FeedbackView | null>(null);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  function toggleRecommend(feedback: FeedbackView, next: boolean) {
    setRecommended((prev) => ({ ...prev, [feedback.id]: next }));
    setAnnouncement(`${feedback.testerNickname}님의 피드백을 ${next ? "추천했어요" : "추천에서 뺐어요"}`);
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
  const recommendedCount = feedbacks.filter((item) => isRecommended(item) && (statuses[item.id] ?? item.status) !== "reported").length;

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <p data-testid="feedback-by-item" className="text-sm text-text-muted">
        항목별 {byItem.map(([title, count]) => `${title} ${count}건`).join(" · ")}
        <span data-testid="recommended-count"> · 추천 {recommendedCount}건</span>
      </p>
      <ul className="flex flex-col gap-3">
        {feedbacks.map((item) => {
          const status = statuses[item.id] ?? item.status;
          const liked = isRecommended(item) && status !== "reported";
          return (
            <li key={item.id} data-testid="feedback" className="flex flex-col gap-3 rounded-2xl bg-surface-muted p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold">{item.testerNickname}</span>
                <Badge tone="neutral">{itemTitle(item.testItemId)}</Badge>
                <Badge tone={status === "waiting" ? "accent" : "muted"}>{FEEDBACK_STATUS_LABEL[status]}</Badge>
                <span className="text-sm text-text-muted">{formatDate(item.submittedAt)} 제출</span>
                {status === "waiting" && (
                  <span className="text-sm text-text-muted">{item.hoursUntilPaid}시간 뒤 자동 지급</span>
                )}
                <span className="ml-auto flex gap-2">
                  {status !== "reported" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      aria-pressed={liked}
                      aria-label={`${item.testerNickname}님의 피드백 추천`}
                      onClick={() => toggleRecommend(item, !liked)}
                    >
                      {liked ? "추천함" : "추천"}
                    </Button>
                  )}
                  {status === "waiting" && item.hoursUntilPaid > 0 && (
                    <Button size="sm" variant="secondary" onClick={() => openReport(item)}>
                      신고
                    </Button>
                  )}
                </span>
              </div>
              <p className="text-sm">{item.content}</p>
              {item.images.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {item.images.map((image) => (
                    <li key={image.url}>
                      <a href={image.url} target="_blank" rel="noopener noreferrer" className="block w-40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image.url} alt={image.name} className="aspect-video w-full rounded-xl bg-surface-strong object-cover" />
                        <span className="sr-only"> (새 탭에서 크게 보기)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

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
