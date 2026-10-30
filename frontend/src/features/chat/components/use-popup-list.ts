import { type KeyboardEvent, useEffect, useRef, useState } from "react";

function popupItems(root: HTMLElement | null) {
  return [...(root?.querySelectorAll<HTMLElement>("[data-popup-item]") ?? [])];
}

/**
 * 버튼으로 여닫는 작은 목록(더보기 메뉴, 프로젝트별 보기)의 공통 동작.
 * 열면 고른 항목(aria-selected="true", 없으면 첫 항목)에 포커스가 가고, 위아래 화살표·Home·End로 옮긴다.
 * Esc는 닫고 버튼으로 돌아가며, Tab과 바깥 클릭은 닫기만 한다. 항목에는 data-popup-item을 붙인다.
 */
export function usePopupList() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    (root?.querySelector<HTMLElement>('[data-popup-item][aria-selected="true"]') ?? popupItems(root)[0])?.focus();
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  /** 닫고 포커스를 버튼으로 돌린다 */
  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!open) return;
    const items = popupItems(rootRef.current);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (next: number) => {
      event.preventDefault();
      items[(next + items.length) % items.length]?.focus();
    };
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") focusAt(index + 1);
    else if (event.key === "ArrowUp") focusAt(index - 1);
    else if (event.key === "Home") focusAt(0);
    else if (event.key === "End") focusAt(items.length - 1);
    else if (event.key === "Tab") setOpen(false);
  }

  return { open, setOpen, close, onKeyDown, rootRef, buttonRef };
}
