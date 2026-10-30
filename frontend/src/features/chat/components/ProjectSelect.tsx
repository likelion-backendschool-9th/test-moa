import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { useId } from "react";
import { cn } from "@/lib/cn";
import type { ChatProjectOption } from "../types";
import { usePopupList } from "./use-popup-list";

type ProjectSelectProps = {
  projects: ChatProjectOption[];
  /** 조건과 관계없는 전체 채팅방 수. "전체 프로젝트"에 붙는다 */
  total: number;
  /** 고른 프로젝트의 모집 건 slug. 전체면 null */
  value: string | null;
  onChange: (slug: string | null) => void;
};

/**
 * 프로젝트별 보기 드롭다운. 프로젝트가 늘어나도 한 자리만 차지하고, 목록이 길면 안에서 스크롤한다.
 * 프로젝트를 고르면 버튼이 강조색으로 바뀌어 필터가 걸려 있음을 알린다. ChatFilters 안에서만 쓰는 클라이언트 컴포넌트다.
 */
export function ProjectSelect({ projects, total, value, onChange }: ProjectSelectProps) {
  const { open, setOpen, close, onKeyDown, rootRef, buttonRef } = usePopupList();
  const listId = useId();
  const selected = projects.find((project) => project.slug === value);
  const options = [{ slug: null, name: "전체 프로젝트", count: total }, ...projects];

  function choose(slug: string | null) {
    close();
    if (slug !== value) onChange(slug);
  }

  return (
    <div ref={rootRef} onKeyDown={onKeyDown} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex max-w-56 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors duration-300 ease-brand",
          selected ? "bg-accent-soft text-accent" : "bg-surface-strong text-text hover:bg-line",
        )}
      >
        {selected ? (
          <>
            <span className="sr-only">프로젝트별: </span>
            <span className="truncate">{selected.name}</span>
          </>
        ) : (
          "프로젝트별"
        )}
        <CaretDownIcon
          aria-hidden
          size={14}
          weight="bold"
          className={cn("shrink-0 transition-transform duration-300 ease-brand", open && "rotate-180")}
        />
      </button>
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="프로젝트별 보기"
          className="absolute top-full right-0 z-(--z-popover) mt-2 flex max-h-72 w-64 animate-rise-in flex-col overflow-y-auto rounded-xl border border-line bg-surface-muted p-1.5"
        >
          {options.map((option) => {
            const isSelected = option.slug === value;
            return (
              <button
                key={option.slug ?? "all"}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-popup-item
                onClick={() => choose(option.slug)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors duration-300 ease-brand",
                  isSelected ? "bg-accent-soft text-accent" : "hover:bg-surface-strong focus:bg-surface-strong",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{option.name}</span>{" "}
                <span className="tabular-nums opacity-60">{option.count}</span>
                <CheckIcon aria-hidden size={14} weight="bold" className={cn("shrink-0", !isSelected && "invisible")} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
