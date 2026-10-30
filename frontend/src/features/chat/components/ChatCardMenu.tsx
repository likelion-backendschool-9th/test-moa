"use client";

import { DotsThreeIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useId } from "react";
import { usePopupList } from "./use-popup-list";

type ChatCardMenuProps = {
  projectName: string;
  roomHref: string;
  recruitmentHref: string;
};

const itemClass =
  "flex rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-300 ease-brand hover:bg-surface-strong focus:bg-surface-strong";

/** 채팅 카드의 더보기 메뉴. 이미 있는 페이지로 가는 항목만 둔다. 여닫기와 키보드 동작은 usePopupList */
export function ChatCardMenu({ projectName, roomHref, recruitmentHref }: ChatCardMenuProps) {
  const { open, setOpen, onKeyDown, rootRef, buttonRef } = usePopupList();
  const menuId = useId();

  return (
    <div ref={rootRef} onKeyDown={onKeyDown} className="relative -mt-1.5 -mr-1.5 shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${projectName} 채팅 더보기`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center rounded-full text-text-muted transition-colors duration-300 ease-brand hover:bg-surface-strong hover:text-text aria-expanded:bg-accent-soft aria-expanded:text-accent"
      >
        <DotsThreeIcon aria-hidden size={20} weight="bold" />
      </button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          aria-label={`${projectName} 채팅 메뉴`}
          className="absolute top-full right-0 z-(--z-popover) mt-2 flex min-w-40 animate-rise-in flex-col rounded-xl border border-line bg-surface-muted p-1.5"
        >
          <li role="none">
            <Link role="menuitem" data-popup-item href={roomHref} className={itemClass}>
              채팅방 열기
            </Link>
          </li>
          <li role="none">
            <Link role="menuitem" data-popup-item href={recruitmentHref} className={itemClass}>
              모집 글 보기
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
