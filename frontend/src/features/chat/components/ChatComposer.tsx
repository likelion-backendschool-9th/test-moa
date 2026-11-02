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
import { sendChatMessageAction } from "../actions";
import { CHAT_MESSAGE_MAX, type ChatMessage } from "../types";
import { bubbleClass, bubbleMetaClass, bubbleRowClass, dayDividerClass } from "./bubble";

type ChatComposerProps = {
  roomKey: string;
  /** 대화 기록의 마지막 메시지. 바뀌면(새로 보낸 메시지가 저장되면) 최근 메시지로 스크롤하고, 보내는 중 말풍선의 자리를 정한다 */
  lastMessage: Pick<ChatMessage, "id" | "from" | "sentAt"> | null;
  /** 대화 내용의 날짜 기준 시각 */
  now: string;
};

/**
 * 채팅방 아래에 붙는 메시지 입력창. Enter로 보내고 Shift+Enter로 줄을 바꾸며, 한글 조합 중의 Enter는 글자 확정으로 보고 보내지 않는다.
 * 보내기를 누르면 서버 응답 전에 보내는 중 말풍선을 먼저 보여 주고(useOptimistic), 저장되면 서버가 다시 그린 대화 내용으로 바뀐다.
 * 보내지 못하면 글을 입력창에 되돌리고 알린다.
 * 열 때와 메시지를 보낸 뒤에는 이 입력창의 끝이 화면 아래에 오도록 스크롤해, 가장 최근 메시지가 입력창 바로 위에 보인다.
 * 보내는 중 말풍선은 저장된 뒤 놓일 자리에 미리 둔다. 마지막 대화가 오늘이 아니면 "오늘" 구분 아래에 두어 저장될 때 튀지 않는다.
 */
export function ChatComposer({ roomKey, lastMessage, now }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, addPending] = useOptimistic<string[], string>([], (list, message) => [...list, message]);
  const [, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const scrolledOnce = useRef(false);
  const inputId = useId();
  const hintId = useId();
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
    if (!message) return;
    setText("");
    setFailed(false);
    startTransition(async () => {
      addPending(message);
      try {
        await sendChatMessageAction(roomKey, message);
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
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    send();
  }

  return (
    <>
      {pending.length > 0 && (
        /* 대화 내용과 같은 간격: 날짜 묶음 사이 32px, 보낸 사람이 바뀌면 12px, 같은 사람이면 4px */
        <div className={cn("flex flex-col gap-4", startsToday ? "mt-8" : lastMessage?.from === "me" ? "mt-1" : "mt-3")}>
          {startsToday && (
            <p aria-hidden data-pending-day className={dayDividerClass}>
              오늘
            </p>
          )}
          <ol aria-label="보내는 중인 메시지" className="flex flex-col gap-1">
            {pending.map((message, index) => (
              <li key={index} data-pending className={bubbleRowClass("me")}>
                <p className={`${bubbleClass("me", true)} opacity-60`}>{message}</p>
                <span className={bubbleMetaClass}>보내는 중</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {/* 대화가 짧으면 mt-auto로 화면 아래까지 내려가고, 길면 화면 아래에 붙는다 */}
      <div className="sticky bottom-0 mt-auto bg-surface pt-4 pb-4 md:pb-6">
        {failed && (
          <p role="alert" className="mb-2 px-5 text-sm font-semibold">
            보내지 못했어요. 다시 보내 주세요.
          </p>
        )}
        <form
          onSubmit={onSubmit}
          className="flex items-end gap-2 rounded-2xl bg-surface-muted py-2 pr-2 pl-5 transition-shadow duration-300 ease-brand focus-within:ring-2 focus-within:ring-accent"
        >
          <label htmlFor={inputId} className="sr-only">
            메시지 입력
          </label>
          <textarea
            id={inputId}
            name="message"
            rows={1}
            value={text}
            maxLength={CHAT_MESSAGE_MAX}
            placeholder="메시지를 입력하세요"
            enterKeyHint="send"
            aria-describedby={hintId}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            className="max-h-32 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm leading-relaxed field-sizing-content outline-none"
          />
          <button
            type="submit"
            aria-label="보내기"
            disabled={!canSend}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent transition-[opacity,transform] duration-300 ease-brand hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
          >
            <PaperPlaneRightIcon aria-hidden size={18} weight="fill" />
          </button>
        </form>
        <p id={hintId} className="mt-2 hidden px-5 text-xs text-text-muted md:block">
          Enter로 보내고, Shift+Enter로 줄을 바꿔요.
        </p>
      </div>
      <div ref={endRef} />
    </>
  );
}
