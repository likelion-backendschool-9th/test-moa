"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
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
  /* 마지막으로 보낸 조건. 새 주소로 화면이 다시 그려지기 전에 탭·정렬·검색이 이어져도 앞의 선택을 덮어쓰지 않게 여기에 합친다 */
  const latest = useRef(query);

  /* 조건 초기화처럼 바깥에서 q가 바뀌면 입력값을 맞춘다. 내가 보낸 값이면 입력 중인 글자를 지키려고 그대로 둔다 */
  if (query.q !== syncedQ) {
    setSyncedQ(query.q);
    if (query.q !== pushedQ) setValue(query.q);
  }

  useEffect(() => {
    latest.current = query;
  }, [query]);

  /*
   * 화면을 떠나면 기다리던 검색을 버린다. 늦게 실행된 검색이 다른 페이지로 가던 이동을 덮어써 채팅함으로 되돌아오지 않게 한다.
   * 이동이 끝나 화면이 숨겨질 때(effect 정리)만으로는 늦어서, 링크를 누르는 순간과 뒤로·앞으로 가기에서도 버린다.
   */
  useEffect(() => {
    const cancel = () => {
      clearTimeout(timer.current);
      timer.current = undefined;
    };
    const cancelOnLink = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("a[href]")) cancel();
    };
    document.addEventListener("click", cancelOnLink, true);
    window.addEventListener("popstate", cancel);
    return () => {
      document.removeEventListener("click", cancelOnLink, true);
      window.removeEventListener("popstate", cancel);
      cancel();
    };
  }, []);

  function navigate(next: Partial<ChatQuery>) {
    latest.current = { ...latest.current, ...next };
    const href = toChatsHref(latest.current);
    startTransition(() => router.replace(href, { scroll: false }));
  }

  function cancelSearch() {
    clearTimeout(timer.current);
    timer.current = undefined;
  }

  function pushSearch(text: string) {
    const q = text.trim();
    setPushedQ(q);
    return q;
  }

  function onSearch(text: string) {
    setValue(text);
    cancelSearch();
    timer.current = setTimeout(() => {
      timer.current = undefined;
      navigate({ q: pushSearch(text) });
    }, SEARCH_DEBOUNCE_MS);
  }

  /** 탭·정렬을 바꿀 때 기다리던 검색어가 있으면 같이 보낸다 */
  function navigateWithPendingSearch(next: Partial<ChatQuery>) {
    if (timer.current === undefined) return navigate(next);
    cancelSearch();
    navigate({ ...next, q: pushSearch(value) });
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
                onClick={() => navigateWithPendingSearch({ role: tab.value })}
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
              onClick={() => navigateWithPendingSearch({ sort })}
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
