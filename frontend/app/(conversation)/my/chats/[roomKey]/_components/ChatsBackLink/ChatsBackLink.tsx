"use client";

import { CaretLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useInboxHref } from "@/features/chat/inbox-href";
import styles from "./ChatsBackLink.module.css";

/** 채팅방 맨 위의 "채팅함" 링크. 마지막으로 본 채팅함의 검색·역할·정렬 그대로 돌아간다 */
export function ChatsBackLink() {
  return (
    <Link
      href={useInboxHref()}
      className={styles.root}
    >
      <CaretLeftIcon aria-hidden size={16} weight="bold" />
      채팅함
    </Link>
  );
}
