"use client";

import { DotsThreeIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

type ChatCardMenuProps = {
  projectName: string;
  roomHref: string;
  recruitmentHref: string;
};

const itemClass =
  "flex rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-300 ease-brand hover:bg-surface-strong focus:bg-surface-strong";

function menuItems(root: HTMLElement | null) {
  return [...(root?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
}

/**
 * 채팅 카드의 더보기 메뉴. 이미 있는 페이지로 가는 항목만 둔다.
 * 열면 첫 항목으로 포커스가 가고, 위아래 화살표로 옮기며, Esc·Tab·바깥 클릭으로 닫는다.
 */
export function ChatCardMenu({ projectName, roomHref, recruitmentHref }: ChatCardMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    menuItems(rootRef.current)[0]?.focus();
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) return;
    const items = menuItems(rootRef.current);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (next: number) => {
      event.preventDefault();
      items[(next + items.length) % items.length]?.focus();
    };
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "ArrowDown") focusAt(index + 1);
    else if (event.key === "ArrowUp") focusAt(index - 1);
    else if (event.key === "Home") focusAt(0);
    else if (event.key === "End") focusAt(items.length - 1);
    else if (event.key === "Tab") setOpen(false);
  }

  return (
    <div ref={rootRef} onKeyDown={onKeyDown} className="relative -mt-1 -mr-1 shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${projectName} 채팅 더보기`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center rounded-full text-text-muted transition-colors duration-300 ease-brand hover:bg-surface-strong hover:text-text aria-expanded:bg-surface-strong aria-expanded:text-text"
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
            <Link role="menuitem" href={roomHref} className={itemClass}>
              채팅방 열기
            </Link>
          </li>
          <li role="none">
            <Link role="menuitem" href={recruitmentHref} className={itemClass}>
              모집 글 보기
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
