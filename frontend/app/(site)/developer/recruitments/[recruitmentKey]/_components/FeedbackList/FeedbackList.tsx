"use client";

import { CaretDownIcon, FlagIcon, HeartIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { unstable_rethrow } from "next/navigation";
import { type ReactNode, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { formatDate } from "@/lib/format";
import { getFollowupQuestions, recommendFeedbackAction, reportFeedbackAction } from "@/features/recruitment/actions";
import type { FeedbackView } from "@/features/recruitment/types";
import { type FeedbackStatus, SELECTION_MODE_LABEL, type SelectionMode, type TestItem } from "@/features/recruitment/types";
import { SelectField } from "@/components/ui/SelectField/SelectField";
import { CHAT_NOT_READY, FollowupQuestionsDialog, type FollowupState } from "../FollowupQuestionsDialog/FollowupQuestionsDialog";
import { ManageDashboard } from "../ManageDashboard/ManageDashboard";
import { useStartChat } from "../../_lib/use-start-chat";
import { TextArea } from "@/components/ui/TextField/TextField";
import { Card } from "@/components/ui/Card/Card";
import styles from "./FeedbackList.module.css";

/*
 * 피드백 탭. 피드백마다 어느 테스트 항목에 대한 것인지(없으면 기타 의견)와 붙인 스크린샷을 보여 준다.
 * 카드 아래 버튼 줄은 언제나 4개다: 채팅하기, AI 질문 받기(둘은 유료 기능), 유용해요(예전 "추천"), 신고.
 * - 상태 배지 대신 신고 버튼이 상태를 보여 준다. 신고했으면 "신고 정보", 아니면 "신고하기"다.
 *   신고하기는 제출 후 72시간 안에만 대화상자를 열고, 지난 피드백은 신고 기간이 지났다고 안내한다.
 * - 구독하지 않은 계정에서는 채팅하기·AI 질문 받기가 구독 안내로 이어진다.
 * - 유용해요와 신고는 백엔드에 저장한다(#190). 저장에 실패하면 유용해요는 되돌리고 카드에, 신고는 대화상자에 이유를 보여 준다.
 *   참가 id가 있으면 채팅방을 열고 이동한다. 목업의 채팅하기와 신고 정보 조회는 준비 중 안내를 보여 준다.
 * 대화상자는 기본 dialog를 써서 Esc 닫기와 포커스 복귀를 브라우저에 맡긴다.
 */

const SUBSCRIPTION_PATH = "/subscription";
const REPORT_INFO_NOT_READY = "신고 정보는 준비 중이에요";
/* README: 제출 후 72시간 동안 신고가 없으면 자동 지급되고, 그 뒤에는 신고할 수 없다 */
const REPORT_CLOSED = "신고는 제출 후 72시간 안에만 할 수 있어요";
const SAVE_NETWORK_ERROR = "연결이 불안정해 저장하지 못했어요. 잠시 후 다시 시도해 주세요";
const FOLLOWUP_NETWORK_ERROR ="연결이 불안정해 질문을 받지 못했어요. 잠시 후 다시 시도해 주세요";

const icon = { "aria-hidden": true, size: 16, weight: "bold" } as const;

type FeedbackListProps = {
  feedbacks: FeedbackView[];
  testItems: TestItem[];
  recruitmentKey: string;
  /** 내 계정이 구독 중이면 채팅하기·AI 질문 받기를 바로 쓴다 */
  isSubscribed: boolean;
  confirmedCount: number;
  /** 피드백을 한 건이라도 낸 확정 테스터 수 */
  submittedCount: number;
  submitDeadline: string;
  selectionMode: SelectionMode;
};

/* 테스트 항목 거르기의 "전체"와 "기타 의견". 항목 id와 겹치지 않는 값이다 */
const ALL_ITEMS = "__all";
const OTHER_ITEMS = "__other";
const ORDER_LABEL = { latest: "최신순", oldest: "오래된순" } as const;

/** 맨 위 현황, 검색·항목·정렬 도구, 피드백 목록과 신고·AI 질문 대화상자 */
export function FeedbackList({
  feedbacks,
  testItems,
  recruitmentKey,
  isSubscribed,
  confirmedCount,
  submittedCount,
  submitDeadline,
  selectionMode,
}: FeedbackListProps) {
  const { start, isPending } = useStartChat(recruitmentKey);
  /* 검색어는 검색 버튼(엔터)을 눌러야 적용한다 */
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [itemFilter, setItemFilter] = useState(ALL_ITEMS);
  const [order, setOrder] = useState<keyof typeof ORDER_LABEL>("latest");
  const [statuses, setStatuses] = useState<Record<string, FeedbackStatus>>({});
  const [recommended, setRecommended] = useState<Record<string, boolean>>({});
  /** 요청 실패나 아직 준비되지 않은 기능을 카드에 보여 줄 안내 */
  const [notices, setNotices] = useState<Record<string, string>>({});
  const [followups, setFollowups] = useState<Record<string, FollowupState>>({});
  const [asking, setAsking] = useState<FeedbackView | null>(null);
  const [target, setTarget] = useState<FeedbackView | null>(null);
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  /** 저장 중인 유용해요. 응답 전 연속 클릭을 막아, 실패 복원 값이 늘 마지막 저장 성공 값이 되게 한다 */
  const recommending = useRef(new Set<string>());
  /** 지금 열려 있는 신고 대화상자의 피드백. 늦게 끝난 다른 피드백의 요청이 이 폼을 건드리지 않게 한다 */
  const openReportId = useRef<string | null>(null);

  /** 먼저 화면에 반영하고 저장한다. 저장하지 못하면 이전 값으로 되돌리고 이유를 카드에 보여 준다 */
  async function toggleRecommend(feedback: FeedbackView, next: boolean) {
    if (recommending.current.has(feedback.id)) return;
    recommending.current.add(feedback.id);
    const previous = recommended[feedback.id] ?? feedback.recommended;
    setRecommended((prev) => ({ ...prev, [feedback.id]: next }));
    setNotices((prev) => ({ ...prev, [feedback.id]: "" }));
    let message: string | null = null;
    try {
      const result = await recommendFeedbackAction(feedback.id, next);
      if (!result.ok) message = result.message;
    } catch (caught) {
      unstable_rethrow(caught);
      message = SAVE_NETWORK_ERROR;
    }
    recommending.current.delete(feedback.id);
    if (message === null) {
      setAnnouncement(`${feedback.testerNickname}님의 피드백${next ? "을 유용해요로 표시했어요" : "에서 유용해요를 뺐어요"}`);
      return;
    }
    setRecommended((prev) => ({ ...prev, [feedback.id]: previous }));
    showNotice(feedback, message);
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
    openReportId.current = feedback.id;
    dialogRef.current?.showModal();
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const reason = String(new FormData(form).get("reason") ?? "").trim();
    if (!reason) {
      setError("신고 사유를 적어 주세요");
      return;
    }
    if (!target || reporting) return;
    setReporting(true);
    setError("");
    let message: string | null = null;
    try {
      const result = await reportFeedbackAction(target.id, reason);
      if (!result.ok) message = result.message;
    } catch (caught) {
      unstable_rethrow(caught);
      message = SAVE_NETWORK_ERROR;
    }
    setReporting(false);
    /* 저장 중에 대화상자를 닫고 다른 피드백의 신고를 열었다면 그 폼은 건드리지 않는다 */
    const stillOpen = openReportId.current === target.id;
    if (message !== null) {
      if (stillOpen) setError(message);
      else showNotice(target, message);
      return;
    }
    setStatuses((prev) => ({ ...prev, [target.id]: "reported" }));
    setAnnouncement(`${target.testerNickname}님의 피드백을 신고했어요`);
    if (stillOpen) {
      form.reset();
      dialogRef.current?.close();
    }
  }

  const dashboard = (
    <ManageDashboard
      id="feedback-dashboard-heading"
      title="제출 / 확정"
      value={submittedCount}
      total={confirmedCount}
      valueLabel="제출"
      totalLabel="확정 테스터"
      valueTestId="submitted-count"
      stats={[
        ["제출된 피드백", `${feedbacks.length}건`],
        ["제출 마감", formatDate(submitDeadline)],
        ["선발 방식", SELECTION_MODE_LABEL[selectionMode]],
      ]}
    />
  );
  if (feedbacks.length === 0) {
    return (
      <div className={styles.page}>
        {dashboard}
        <EmptyState title="아직 제출된 피드백이 없어요" />
      </div>
    );
  }

  const isOther = (feedback: FeedbackView) => !testItems.some((item) => item.id === feedback.testItemId);
  /* 검색은 피드백 내용에서만 찾는다 */
  const keyword = query.trim().toLowerCase();
  const shown = feedbacks
    .filter((item) => itemFilter === ALL_ITEMS || (itemFilter === OTHER_ITEMS ? isOther(item) : item.testItemId === itemFilter))
    .filter((item) => !keyword || item.content.toLowerCase().includes(keyword))
    .sort((a, b) => (order === "latest" ? b.submittedAt.localeCompare(a.submittedAt) : a.submittedAt.localeCompare(b.submittedAt)));

  const itemTitle = (id: string | null) => testItems.find((item) => item.id === id)?.title ?? "기타 의견";
  /* 드롭다운 항목 옆에 붙이는 항목별 피드백 수 */
  const countOf = (testItemId: string) => feedbacks.filter((feedback) => feedback.testItemId === testItemId).length;
  const isRecommended = (item: FeedbackView) => recommended[item.id] ?? item.recommended;

  return (
    <div className={styles.page}>
      {dashboard}
      <div className={styles.toolbar}>
        <form
          role="search"
          className={styles.search}
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(draft);
          }}
        >
          <label className={styles.searchField}>
            <MagnifyingGlassIcon aria-hidden size={18} weight="bold" className={styles.searchIcon} />
            <input
              type="search"
              aria-label="피드백 내용 검색"
              placeholder="피드백 내용으로 검색"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className={styles.searchInput}
            />
          </label>
          <Button type="submit" size="sm">
            검색
          </Button>
        </form>
        <div className={styles.selectBox}>
          <SelectField aria-label="테스트 항목" value={itemFilter} onChange={(event) => setItemFilter(event.target.value)} className={styles.select}>
            <option value={ALL_ITEMS}>모든 테스트 항목 {feedbacks.length}</option>
            {testItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} {countOf(item.id)}
              </option>
            ))}
            <option value={OTHER_ITEMS}>기타 의견 {feedbacks.filter(isOther).length}</option>
          </SelectField>
          <CaretDownIcon aria-hidden size={14} weight="bold" className={styles.selectIcon} />
        </div>
        <div role="group" aria-label="정렬" className={styles.sort}>
          {(["latest", "oldest"] as const).map((value) => (
            <Button key={value} size="sm" variant={order === value ? "primary" : "secondary"} aria-pressed={order === value} onClick={() => setOrder(value)}>
              {ORDER_LABEL[value]}
            </Button>
          ))}
        </div>
      </div>
      <p aria-live="polite" className={styles.srOnly}>
        {announcement}
      </p>
      {shown.length === 0 && <EmptyState title="조건에 맞는 피드백이 없어요" />}
      <ul className={styles.list}>
        {shown.map((item) => {
          const status = statuses[item.id] ?? item.status;
          const liked = isRecommended(item);
          const nickname = item.testerNickname;
          return (
            <Card as="li" key={item.id} data-testid="feedback" className={styles.root}>
              <div className={styles.box}>
                <div className={styles.box2}>
                  <span className={styles.nickname}>{nickname}</span>
                  <Badge tone="neutral">{itemTitle(item.testItemId)}</Badge>
                </div>
                <p className={styles.text2}>
                  {formatDate(item.submittedAt)} 제출
                  {status === "waiting" && ` · ${item.hoursUntilPaid}시간 뒤 자동 지급`}
                </p>
              </div>
              <p className={styles.content}>{item.content}</p>
              {item.images.length > 0 && (
                <ul className={styles.list2}>
                  {item.images.map((image) => (
                    <li key={image.url}>
                      <a href={image.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
                          alt={image.name}
                          className={styles.image}
                        />
                        <span className={styles.srOnly2}> (새 탭에서 크게 보기)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <div className={styles.box3}>
                {notices[item.id] && <p className={styles.text3}>{notices[item.id]}</p>}
                <PaidAction subscribed={isSubscribed} label={`${nickname}님과 채팅하기`} disabled={isPending} onClick={() => {
                  if (item.registerId) {
                    setNotices((prev) => ({ ...prev, [item.id]: "" }));
                    start(item.registerId, (message) => showNotice(item, message));
                  } else showNotice(item, CHAT_NOT_READY);
                }}>
                  채팅하기
                </PaidAction>
                <PaidAction subscribed={isSubscribed} label={`${nickname}님 피드백으로 AI 질문 받기`} onClick={() => askFollowup(item)}>
                  AI 질문 받기
                </PaidAction>
                <Button
                  size="sm"
                  variant={liked ? "like" : "secondary"}
                  className={styles.cardAction}
                  aria-pressed={liked}
                  aria-label={`${nickname}님의 피드백이 유용해요`}
                  onClick={() => toggleRecommend(item, !liked)}
                >
                  {/* 이번에 직접 누른 하트만 튀어 오른다. 처음부터 눌려 있던 피드백은 그냥 보인다 */}
                  <HeartIcon {...icon} weight={liked ? "fill" : "bold"} className={recommended[item.id] ? styles.iconOn : undefined} />
                  유용해요
                </Button>
                {status === "reported" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className={styles.cardAction}
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
                    className={styles.cardAction}
                    aria-label={`${nickname}님의 피드백 신고하기`}
                    onClick={() => (status === "waiting" && item.hoursUntilPaid > 0 ? openReport(item) : showNotice(item, REPORT_CLOSED))}
                  >
                    <FlagIcon {...icon} />
                    신고하기
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </ul>

      {asking && (
        <FollowupQuestionsDialog
          key={asking.id}
          nickname={asking.testerNickname}
          registerId={asking.registerId}
          recruitmentKey={recruitmentKey}
          content={asking.content}
          followup={followups[asking.id] ?? { state: "loading" }}
          onRetry={() => askFollowup(asking)}
          onClose={() => setAsking(null)}
        />
      )}

      <Card as="dialog"
        ref={dialogRef}
        onClose={() => {
          openReportId.current = null;
        }}
        aria-labelledby="report-title"
        className={styles.dialog}
      >
        <form onSubmit={submitReport} noValidate className={styles.form}>
          <h2 id="report-title" className={styles.title}>
            피드백 신고
          </h2>
          <p className={styles.text4}>
            {target?.testerNickname}님의 피드백을 신고해요. 운영자가 검토하고, 그동안 보상 지급은 멈춰요.
          </p>
          <label htmlFor="report-reason" className={styles.field}>
            신고 사유
          </label>
          <TextArea
            id="report-reason"
            name="reason"
            rows={4}
            maxLength={500}
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "report-reason-error" : undefined}
          />
          {error && (
            <p id="report-reason-error" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.box4}>
            <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
              취소
            </Button>
            <Button type="submit" disabled={reporting}>
              {reporting ? "신고 중…" : "신고하기"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

/** 유료 기능 버튼. 보통 버튼에 PRO 표시를 붙인다. 구독 모집이면 바로 쓰고, 무료 모집이면 구독 안내로 간다 */
function PaidAction({ subscribed, label, onClick, children, disabled }: { subscribed: boolean; label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  const content = (
    <>
      {children}
      <span aria-hidden="true" className={styles.proMark}>
        PRO
      </span>
    </>
  );
  if (!subscribed) {
    return (
      <LinkButton href={SUBSCRIPTION_PATH} size="sm" variant="secondary" className={styles.cardAction} aria-label={`${label}, 구독하면 쓸 수 있어요`}>
        {content}
      </LinkButton>
    );
  }
  return (
    <Button size="sm" variant="secondary" className={styles.cardAction} aria-label={label} onClick={onClick} disabled={disabled}>
      {content}
    </Button>
  );
}
