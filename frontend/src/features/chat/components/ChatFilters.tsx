"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { CHAT_SORT_LABEL, toChatsHref, type ChatQuery, type ChatSort } from "../query";
import type { ChatProjectOption } from "../types";

const SEARCH_DEBOUNCE_MS = 300;

const chipClass = (active: boolean) =>
  cn(
    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors duration-300 ease-brand",
    active ? "bg-text text-surface" : "bg-surface-strong text-text hover:bg-line",
  );

type ChatFiltersProps = {
  query: ChatQuery;
  projects: ChatProjectOption[];
  /** 조건과 관계없는 전체 채팅방 수. "전체" 칩에 붙는다 */
  total: number;
};

/** 채팅함 위쪽의 채팅방 검색, 프로젝트별 보기, 정렬. 상태는 URL에만 둔다 */
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

  const chips: Array<{ value: string | null; label: string; count: number }> = [
    { value: null, label: "전체", count: total },
    ...projects.map((project) => ({ value: project.slug, label: project.name, count: project.count })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <label className="flex w-full items-center gap-2 rounded-full bg-surface-strong px-5 py-3 transition-colors duration-300 ease-brand focus-within:bg-surface-muted focus-within:ring-2 focus-within:ring-accent sm:max-w-md">
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
        <div role="group" aria-label="정렬" className="flex shrink-0 gap-4 text-sm">
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
      </div>
      <div role="group" aria-label="프로젝트" className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = query.project === chip.value;
          return (
            <button key={chip.label} type="button" aria-pressed={active} onClick={() => navigate({ project: chip.value })} className={chipClass(active)}>
              {/* 공백은 화면에 보이지 않고 "전체 4"처럼 띄어 읽게 한다 */}
              {chip.label}{" "}
              <span className="font-semibold tabular-nums opacity-60">{chip.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
