"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { CHAT_SORT_LABEL, toChatsHref, type ChatQuery, type ChatSort } from "../query";
import type { ChatProjectOption } from "../types";
import { ProjectSelect } from "./ProjectSelect";

const SEARCH_DEBOUNCE_MS = 300;

type ChatFiltersProps = {
  query: ChatQuery;
  projects: ChatProjectOption[];
  /** 조건과 관계없는 전체 채팅방 수 */
  total: number;
};

/** 채팅함 위쪽의 채팅방 검색, 정렬, 프로젝트별 보기. 상태는 URL에만 둔다 */
export function ChatFilters({ query, projects, total }: ChatFiltersProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [value, setValue] = useState(query.q);
  const [syncedQ, setSyncedQ] = useState(query.q);
  const [pushedQ, setPushedQ] = useState(query.q);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* 조건 초기화처럼 바깥에서 q가 바뀌면 입력값을 맞춘다. 내가 보낸 값이면 입력 중인 글자를 지키려고 그대로 둔다 */
  if (query.q !== syncedQ) {
    setSyncedQ(query.q);
    if (query.q !== pushedQ) setValue(query.q);
  }

  function navigate(next: Partial<ChatQuery>) {
    startTransition(() => router.replace(toChatsHref({ ...query, ...next }), { scroll: false }));
  }

  function onSearch(text: string) {
    setValue(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const q = text.trim();
      setPushedQ(q);
      navigate({ q });
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <label className="flex w-full items-center gap-2 rounded-full bg-surface-strong px-5 py-3 transition-colors duration-300 ease-brand focus-within:bg-surface-muted focus-within:ring-2 focus-within:ring-accent sm:max-w-sm">
        <MagnifyingGlassIcon aria-hidden size={18} weight="bold" className="shrink-0 text-text-muted" />
        <input
          type="search"
          aria-label="채팅방 검색"
          placeholder="프로젝트명이나 닉네임으로 찾아보세요"
          value={value}
          onChange={(event) => onSearch(event.target.value)}
          className="w-full min-w-0 bg-transparent outline-none"
        />
      </label>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div role="group" aria-label="정렬" className="flex gap-4 text-sm">
          {(Object.keys(CHAT_SORT_LABEL) as ChatSort[]).map((sort) => (
            <button
              key={sort}
              type="button"
              aria-pressed={query.sort === sort}
              onClick={() => navigate({ sort })}
              className={cn(
                "font-bold transition-colors duration-300 ease-brand",
                query.sort === sort ? "text-text" : "text-text-muted hover:text-text",
              )}
            >
              {CHAT_SORT_LABEL[sort]}
            </button>
          ))}
        </div>
        <span aria-hidden className="hidden h-4 w-px bg-line sm:block" />
        <ProjectSelect projects={projects} total={total} value={query.project} onChange={(project) => navigate({ project })} />
      </div>
    </div>
  );
}
