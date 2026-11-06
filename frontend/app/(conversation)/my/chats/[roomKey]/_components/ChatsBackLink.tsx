"use client";

import { CaretLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useInboxHref } from "@/features/chat/inbox-href";

/** 채팅방 맨 위의 "채팅함" 링크. 마지막으로 본 채팅함의 검색·역할·정렬 그대로 돌아간다 */
export function ChatsBackLink() {
  return (
    <Link
      href={useInboxHref()}
      className="mb-5 -ml-1.5 inline-flex items-center gap-1 self-start rounded-full py-1.5 pr-3 pl-1.5 text-sm font-semibold text-text-muted transition-colors duration-300 ease-brand hover:bg-surface-strong hover:text-text"
    >
      <CaretLeftIcon aria-hidden size={16} weight="bold" />
      채팅함
    </Link>
  );
}
