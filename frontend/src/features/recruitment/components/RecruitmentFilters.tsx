"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { SORT_LABEL, toSearchParams, type RecruitmentQuery, type RecruitmentSort } from "../query";
import { SOFTWARE_TYPE_LABEL, SOFTWARE_TYPES, type SoftwareType } from "../types";

const SEARCH_DEBOUNCE_MS = 300;

const chipClass = (active: boolean) =>
  cn(
    "rounded-full px-4 py-2 text-sm font-bold transition-colors duration-300 ease-brand",
    active ? "bg-text text-surface" : "bg-surface-strong text-text hover:bg-line",
  );

/** 전체 테스트 그리드의 검색·카테고리·필터·정렬. 상태는 URL에만 둔다 */
export function RecruitmentFilters({ query }: { query: RecruitmentQuery }) {
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

  function navigate(next: Partial<RecruitmentQuery>) {
    const params = toSearchParams({ ...query, ...next });
    const href = params.size ? `/?${params}` : "/";
    startTransition(() => router.replace(href, { scroll: false }));
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

  const categories: Array<{ value: SoftwareType | null; label: string }> = [
    { value: null, label: "전체" },
    ...SOFTWARE_TYPES.map((type) => ({ value: type, label: SOFTWARE_TYPE_LABEL[type] })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <label className="flex max-w-xl items-center gap-2 rounded-full bg-surface-strong px-5 py-3 transition-colors duration-300 ease-brand focus-within:bg-surface-muted focus-within:ring-2 focus-within:ring-accent">
        <MagnifyingGlassIcon aria-hidden size={18} weight="bold" className="text-text-muted" />
        <input
          type="search"
          aria-label="테스트 검색"
          placeholder="서비스 이름이나 해 볼 일로 찾아보세요"
          value={value}
          onChange={(event) => onSearch(event.target.value)}
          className="w-full bg-transparent outline-none"
        />
      </label>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div role="group" aria-label="소프트웨어 유형" className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.label}
              type="button"
              aria-pressed={query.type === category.value}
              onClick={() => navigate({ type: category.value })}
              className={chipClass(query.type === category.value)}
            >
              {category.label}
            </button>
          ))}
        </div>
        <button type="button" aria-pressed={query.open} onClick={() => navigate({ open: !query.open })} className={chipClass(query.open)}>
          모집 중만 보기
        </button>
        <div role="group" aria-label="정렬" className="flex gap-4 text-sm md:ml-auto">
          {(Object.keys(SORT_LABEL) as RecruitmentSort[]).map((sort) => (
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
              {SORT_LABEL[sort]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
