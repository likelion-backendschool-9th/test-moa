"use client";

import { CaretDownIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { SORT_LABEL, toSearchParams, type RecruitmentQuery, type RecruitmentSort } from "@/features/recruitment/query";
import { SOFTWARE_TYPE_LABEL, SOFTWARE_TYPES, type SoftwareType } from "@/features/recruitment/types";
import { SelectField } from "@/components/ui/SelectField/SelectField";
import styles from "./RecruitmentFilters.module.css";

const SEARCH_DEBOUNCE_MS = 300;

const chipClass = (active: boolean) =>
  cn(
    styles.chip,
    active ? styles.chipActive : styles.chipIdle,
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
    /* 조건이 바뀌면 1페이지부터 다시 본다 */
    const params = toSearchParams({ ...query, ...next, page: 1 });
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
    <div className={styles.root}>
      <label className={styles.field}>
        <MagnifyingGlassIcon aria-hidden size={18} weight="bold" className={styles.icon} />
        <input
          type="search"
          aria-label="테스트 검색"
          placeholder="이름이나 할 일로 검색"
          value={value}
          onChange={(event) => onSearch(event.target.value)}
          className={styles.input}
        />
      </label>
      {/* 좁은 화면에서는 칩 줄이 둘째 줄로 내려가 가로로 넘어간다 */}
      <div className={styles.box}>
        <div role="group" aria-label="소프트웨어 유형" className={styles.box2}>
          {categories.map((category) => (
            <button
              key={category.label}
              type="button"
              aria-pressed={query.type === category.value}
              onClick={() => navigate({ type: category.value })}
              className={cn(chipClass(query.type === category.value), styles.root2)}
            >
              {category.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={query.open}
          onClick={() => navigate({ open: !query.open })}
          className={cn(chipClass(query.open), styles.button)}
        >
          모집 중만 보기
        </button>
      </div>
      <div className={styles.box3}>
        <SelectField
          aria-label="정렬"
          value={query.sort}
          onChange={(event) => navigate({ sort: event.target.value as RecruitmentSort })}
          className={styles.select}
        >
          {(Object.keys(SORT_LABEL) as RecruitmentSort[]).map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABEL[sort]}
            </option>
          ))}
        </SelectField>
        <CaretDownIcon
          aria-hidden
          size={14}
          weight="bold"
          className={styles.icon2}
        />
      </div>
    </div>
  );
}
