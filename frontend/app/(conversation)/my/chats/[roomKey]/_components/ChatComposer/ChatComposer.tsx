"use client";

import { PaperPlaneRightIcon } from "@phosphor-icons/react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { cn } from "@/lib/cn";
import { isTodayInSeoul } from "@/lib/format";
import { sendChatMessageAction } from "@/features/chat/actions";
import { CHAT_MESSAGE_MAX, type ChatMessage } from "@/features/chat/types";
import { ChatBubble, ChatBubbleNote, ChatBubbleRow } from "../ChatBubble/ChatBubble";
import { DayDivider } from "../DayDivider/DayDivider";
import { Card } from "@/components/ui/Card/Card";
import { useTouchInput } from "./hook";
import styles from "./ChatComposer.module.css";

type ChatComposerProps = {
  roomKey: string;
  /** 대화 기록의 마지막 메시지. 바뀌면(새로 보낸 메시지가 저장되면) 최근 메시지로 스크롤하고, 보내는 중 말풍선의 자리를 정한다 */
  lastMessage: Pick<ChatMessage, "id" | "from" | "sentAt"> | null;
  /** 대화 내용의 날짜 기준 시각 */
  now: string;
  readOnly: boolean;
  onSent: (result: ChatMessage | { readOnly: true }) => void;
};

/**
 * 채팅방 아래에 붙는 메시지 입력창. 키보드 기기에서는 Enter로 보내고 Shift+Enter로 줄을 바꾼다.
 * 휴대폰 같은 터치 기기에서는 Enter가 줄바꿈이고 보내기 버튼으로만 보낸다. 한글 조합 중의 Enter는 글자 확정으로 보고 보내지 않는다.
 * 보내기를 누르면 서버 응답 전에 보내는 중 말풍선을 먼저 보여 주고(useOptimistic), 저장되면 서버가 다시 그린 대화 내용으로 바뀐다.
 * 보내지 못하면 글을 입력창에 되돌리고 알린다.
 * 열 때와 메시지를 보낸 뒤에는 이 입력창의 끝이 화면 아래에 오도록 스크롤해, 가장 최근 메시지가 입력창 바로 위에 보인다.
 * 보내는 중 말풍선은 저장된 뒤 놓일 자리에 미리 둔다. 마지막 대화가 오늘이 아니면 "오늘" 구분 아래에 두어 저장될 때 튀지 않는다.
 */
export function ChatComposer({ roomKey, lastMessage, now, readOnly, onSent }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, addPending] = useOptimistic<string[], string>([], (list, message) => [...list, message]);
  const [, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrolledOnce = useRef(false);
  const inputId = useId();
  const hintId = useId();
  const touch = useTouchInput();
  const canSend = text.trim().length > 0;
  const lastMessageId = lastMessage?.id ?? null;
  const startsToday = !lastMessage || !isTodayInSeoul(lastMessage.sentAt, new Date(now));

  useEffect(() => {
    /* 처음에는 바로, 보낸 뒤에는 부드럽게 움직인다 */
    endRef.current?.scrollIntoView({ block: "end", behavior: scrolledOnce.current ? "smooth" : "instant" });
    scrolledOnce.current = true;
  }, [lastMessageId, pending.length]);

  /* 다른 화면에 갔다가 돌아오면(숨겨졌다 다시 보이면) 처음 열 때처럼 최근 메시지로 바로 가고, 지난 실패 알림은 지운다 */
  useLayoutEffect(() => {
    return () => {
      scrolledOnce.current = false;
      setFailed(false);
    };
  }, []);

  function send() {
    const message = text.trim();
    if (!message || readOnly) return;
    setText("");
    setFailed(false);
    /* 보내기 버튼을 키보드로 눌렀을 때도 바로 이어 쓸 수 있게 입력창으로 돌아간다 */
    inputRef.current?.focus();
    startTransition(async () => {
      addPending(message);
      try {
        const result = await sendChatMessageAction(roomKey, message);
        if (result) startTransition(() => onSent(result));
      } catch {
        setText((current) => current || message);
        setFailed(true);
      }
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (touch || event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    send();
  }

  return (
    <>
      {!readOnly && pending.length > 0 && (
        /* 대화 내용과 같은 간격: 날짜 묶음 사이 32px, 보낸 사람이 바뀌면 12px, 같은 사람이면 4px */
        <div className={cn(styles.box, startsToday ? styles.boxStartsToday : lastMessage?.from === "me" ? styles.afterMe : styles.afterPartner)}>
          {startsToday && (
            <DayDivider as="p" aria-hidden data-pending-day>
              오늘
            </DayDivider>
          )}
          <ol aria-label="보내는 중인 메시지" className={styles.list}>
            {pending.map((message, index) => (
              <ChatBubbleRow key={index} data-pending from="me">
                <ChatBubble from="me" endsRun className={styles.message}>
                  {message}
                </ChatBubble>
                <ChatBubbleNote>보내는 중</ChatBubbleNote>
              </ChatBubbleRow>
            ))}
          </ol>
        </div>
      )}
      {/* 대화가 짧으면 mt-auto로 화면 아래까지 내려가고, 길면 화면 아래에 붙는다 */}
      <div className={styles.box2}>
        {readOnly ? <p role="status" className={styles.text}>대화가 끝난 방이에요. 지난 대화는 계속 볼 수 있어요.</p> : <>
        {failed && (
          <p role="alert" className={styles.text}>
            보내지 못했어요. 다시 보내 주세요.
          </p>
        )}
        <Card as="form"
          onSubmit={onSubmit}
          className={styles.form}
        >
          <label htmlFor={inputId} className={styles.srOnly}>
            메시지 입력
          </label>
          <textarea
            ref={inputRef}
            id={inputId}
            name="message"
            rows={1}
            value={text}
            maxLength={CHAT_MESSAGE_MAX}
            placeholder="메시지를 입력하세요"
            enterKeyHint={touch ? "enter" : "send"}
            aria-describedby={hintId}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            className={styles.textarea}
          />
          <button
            type="submit"
            aria-label="보내기"
            disabled={!canSend}
            /* 누를 때 입력창의 포커스를 뺏지 않는다. 휴대폰에서 보낼 때마다 키보드가 닫히지 않게 */
            onMouseDown={(event) => event.preventDefault()}
            className={styles.button}
          >
            <PaperPlaneRightIcon aria-hidden size={18} weight="fill" />
          </button>
        </Card>
        {/* 화면에는 md 이상에서만 보이고, 보조 기술에는 늘 입력창 설명으로 읽힌다 */}
        <p id={hintId} className={styles.text2}>
          {touch ? "Enter로 줄을 바꾸고, 보내기 버튼으로 보내요." : "Enter로 보내고, Shift+Enter로 줄을 바꿔요."}
        </p>
        </>}
      </div>
      <div ref={endRef} />
    </>
  );
}
