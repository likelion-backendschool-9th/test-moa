"use client";

import { ChatsIcon, CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { Card } from "@/components/ui/Card/Card";
import styles from "./FollowupQuestionsDialog.module.css";

/*
 * AI 추천 질문 대화상자. 화면에 그려지면 바로 모달로 열린다.
 * 질문을 누르면 클립보드에 복사되고, 개발자는 복사한 질문을 채팅으로 테스터에게 보낸다.
 * Esc, 바깥 클릭, 닫기 버튼 모두 dialog.close()를 거쳐 닫혀서 연 버튼으로 포커스가 돌아간다.
 * 대화상자 밖은 모달이 열린 동안 보조 기술에서 숨겨지므로 안내는 대화상자 안의 aria-live로 읽는다.
 */

/** 채팅방을 만드는 API가 아직 없어 채팅 버튼은 이 안내만 보여 준다 */
export const CHAT_NOT_READY = "채팅방 연결은 준비 중이에요";

/** 질문을 받는 중, 받음, 실패 */
export type FollowupState = { state: "loading" } | { state: "done"; questions: string[] } | { state: "error"; message: string };

type FollowupQuestionsDialogProps = {
  nickname: string;
  /** 질문의 근거가 된 피드백 내용 */
  content: string;
  followup: FollowupState;
  onRetry: () => void;
  /** 대화상자가 닫힌 뒤. 부모가 이 대화상자를 지운다 */
  onClose: () => void;
};

export function FollowupQuestionsDialog({ nickname, content, followup, onRetry, onClose }: FollowupQuestionsDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [copied, setCopied] = useState<number | null>(null);
  const [chatNotice, setChatNotice] = useState("");
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const close = () => ref.current?.close();

  async function copy(question: string, index: number) {
    try {
      await navigator.clipboard.writeText(question);
      setCopied(index);
      setAnnouncement(`${index + 1}번 질문을 복사했어요`);
    } catch {
      setCopied(null);
      setAnnouncement("복사하지 못했어요. 질문을 직접 골라 복사해 주세요");
    }
  }

  function goChat() {
    setChatNotice(CHAT_NOT_READY);
    setAnnouncement(CHAT_NOT_READY);
  }

  return (
    <Card as="dialog"
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className={styles.root}
    >
      <div className={styles.box}>
        <div className={styles.box2}>
          <h2 id={titleId} className={styles.title}>
            AI 추천 질문
          </h2>
          <p id={descriptionId} className={styles.text}>
            {nickname}님 피드백을 보고 만든 질문이에요. 누르면 복사돼요.
          </p>
        </div>
        <blockquote className={styles.content}>{content}</blockquote>

        {followup.state === "loading" && (
          <div role="status" className={styles.box3}>
            <p className={styles.text2}>질문을 만들고 있어요. 잠시만 기다려 주세요</p>
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className={styles.root2} />
            ))}
          </div>
        )}
        {followup.state === "error" && (
          <div className={styles.box4}>
            <p role="alert" className={styles.message}>
              {followup.message}
            </p>
            <Button size="sm" variant="secondary" onClick={onRetry}>
              다시 시도
            </Button>
          </div>
        )}
        {followup.state === "done" && (
          <ol className={styles.list}>
            {followup.questions.map((question, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => copy(question, index)}
                  className={styles.button}
                >
                  <span className={styles.question}>{question}</span>
                  {copied === index ? (
                    <span className={styles.label}>
                      <CheckIcon aria-hidden size={16} weight="bold" />
                      복사했어요
                    </span>
                  ) : (
                    <CopyIcon aria-hidden size={16} weight="bold" className={styles.icon} />
                  )}
                </button>
              </li>
            ))}
          </ol>
        )}

        <div className={styles.box5}>
          {chatNotice && <p className={styles.chatNotice}>{chatNotice}</p>}
          <div className={styles.box6}>
            <Button size="sm" variant="ghost" onClick={close}>
              닫기
            </Button>
            <Button size="sm" onClick={goChat}>
              <ChatsIcon aria-hidden size={16} weight="bold" />
              채팅으로 물어보러 가기
            </Button>
          </div>
        </div>
        <p aria-live="polite" className={styles.srOnly}>
          {announcement}
        </p>
      </div>
    </Card>
  );
}
