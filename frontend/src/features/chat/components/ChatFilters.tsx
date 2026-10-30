"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { CHAT_SORT_LABEL, toChatsHref, type ChatQuery, type ChatSort } from "../query";
import { CHAT_ROLE_LABEL, CHAT_ROLES, type ChatRole, type ChatRoleCounts } from "../types";

const SEARCH_DEBOUNCE_MS = 300;

/** 채팅함 위쪽. 첫 줄은 채팅방 검색, 둘째 줄은 왼쪽 역할 탭과 오른쪽 정렬. 상태는 URL에만 둔다 */
export function ChatFilters({ query, counts }: { query: ChatQuery; counts: ChatRoleCounts }) {
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

  const roleTabs: Array<{ value: ChatRole | null; label: string; count: number }> = [
    { value: null, label: "전체", count: counts.all },
    ...CHAT_ROLES.map((role) => ({ value: role, label: CHAT_ROLE_LABEL[role], count: counts[role] })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <label className="flex w-full items-center gap-2 rounded-full bg-surface-strong px-5 py-3 transition-colors duration-300 ease-brand focus-within:bg-surface-muted focus-within:ring-2 focus-within:ring-accent">
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
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {/* 역할 탭(왼쪽). 칩 회색 홈 안에서 고른 탭만 교정지 면으로 올라오고, 고른 탭의 수는 강조색이다 */}
        <div role="group" aria-label="역할별 보기" className="flex rounded-full bg-surface-strong p-1">
          {roleTabs.map((tab) => {
            const active = query.role === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                aria-pressed={active}
                onClick={() => navigate({ role: tab.value })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-colors duration-300 ease-brand sm:px-4",
                  active ? "bg-surface-muted text-text" : "text-text-muted hover:text-text",
                )}
              >
                {tab.label}{" "}
                <span className={cn("font-semibold tabular-nums", active ? "text-accent" : "opacity-60")}>{tab.count}</span>
              </button>
            );
          })}
        </div>
        {/* 정렬(오른쪽) */}
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
      </div>
    </div>
  );
}
