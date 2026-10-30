"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { cn } from "@/lib/cn";

/** 헤더 검색창. 홈의 전체 테스트 그리드를 검색한다 */
export function HeaderSearch({ className, onSearch }: { className?: string; onSearch?: () => void }) {
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    const params = new URLSearchParams(q ? { q } : {});
    router.push(`/${params.size ? `?${params}` : ""}#all-tests`);
    onSearch?.();
  }

  return (
    <form role="search" onSubmit={onSubmit} className={cn("w-full max-w-sm", className)}>
      <label className="flex items-center gap-2 rounded-full bg-surface-strong px-4 py-2.5 text-sm transition-colors duration-300 ease-brand focus-within:bg-surface-muted focus-within:ring-2 focus-within:ring-accent">
        <MagnifyingGlassIcon aria-hidden size={16} weight="bold" className="text-text-muted" />
        <input
          name="q"
          type="search"
          aria-label="테스트 검색"
          placeholder="테스트를 검색해 주세요"
          className="w-full bg-transparent outline-none"
        />
      </label>
    </form>
  );
}
