"use client";

import { DotsThreeIcon } from "@phosphor-icons/react";
import { type FormEvent, type KeyboardEvent, useEffect, useId, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { deleteChatRoomAction, renameChatRoomAction } from "../actions";
import { CHAT_ROOM_NAME_MAX } from "../types";
import { ChatRoomDialog } from "./ChatRoomDialog";

type ChatCardMenuProps = {
  roomKey: string;
  /** 카드에 보이는 대화방 이름 */
  title: string;
};

type DialogKind = "rename" | "delete";

const itemClass =
  "flex w-full rounded-lg px-3 py-2 text-left text-sm font-semibold whitespace-nowrap transition-colors duration-300 ease-brand hover:bg-surface-strong focus:bg-surface-strong";

function menuItems(root: HTMLElement | null) {
  return [...(root?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
}

/**
 * 채팅 카드의 더보기 메뉴. "대화방 이름 변경", 구분선, "대화방 삭제" 순서이고 삭제는 맨 아래다.
 * 열면 첫 항목으로 포커스가 가고, 위아래 화살표·Home·End로 옮기며, Esc는 닫고 버튼으로 돌아가고, Tab·바깥 클릭은 닫기만 한다.
 * 항목을 고르면 대화상자를 열고, 저장·삭제는 서버 액션으로 보낸다.
 */
export function ChatCardMenu({ roomKey, title }: ChatCardMenuProps) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const inputId = useId();

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

  function openDialog(kind: DialogKind) {
    setOpen(false);
    setDialog(kind);
  }

  /* 대화상자가 사라진 뒤 포커스를 더보기 버튼으로 돌린다 */
  function closeDialog() {
    setDialog(null);
    requestAnimationFrame(() => buttonRef.current?.focus());
  }

  function onRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) return;
    startTransition(async () => {
      await renameChatRoomAction(roomKey, name);
      closeDialog();
    });
  }

  function onDelete() {
    startTransition(async () => {
      await deleteChatRoomAction(roomKey);
      setDialog(null);
    });
  }

  return (
    <div ref={rootRef} onKeyDown={onKeyDown} className="relative -mt-1.5 -mr-1.5 shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${title} 채팅 더보기`}
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
          aria-label={`${title} 채팅 메뉴`}
          className="absolute top-full right-0 z-(--z-popover) mt-2 flex min-w-40 animate-rise-in flex-col rounded-xl border border-line bg-surface-muted p-1.5"
        >
          <li role="none">
            <button type="button" role="menuitem" onClick={() => openDialog("rename")} className={itemClass}>
              대화방 이름 변경
            </button>
          </li>
          <li role="separator" className="mx-2 my-1 h-px bg-line" />
          <li role="none">
            <button type="button" role="menuitem" onClick={() => openDialog("delete")} className={itemClass}>
              대화방 삭제
            </button>
          </li>
        </ul>
      )}
      {dialog === "rename" && (
        <ChatRoomDialog title="대화방 이름 변경" description="채팅함 목록에 보이는 이름을 바꿔요." onClose={closeDialog}>
          <form onSubmit={onRename} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor={inputId} className="text-sm font-semibold">
                대화방 이름
              </label>
              <input
                id={inputId}
                name="name"
                defaultValue={title}
                maxLength={CHAT_ROOM_NAME_MAX}
                required
                className="rounded-full bg-surface-strong px-5 py-3 outline-none transition-colors duration-300 ease-brand focus:bg-surface focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeDialog}>
                취소
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                저장
              </Button>
            </div>
          </form>
        </ChatRoomDialog>
      )}
      {dialog === "delete" && (
        <ChatRoomDialog
          title="대화방을 삭제할까요?"
          description={`"${title}" 대화방이 채팅함 목록에서 사라져요.`}
          onClose={closeDialog}
        >
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={closeDialog}>
              취소
            </Button>
            <Button variant="strong" size="sm" disabled={pending} onClick={onDelete}>
              삭제
            </Button>
          </div>
        </ChatRoomDialog>
      )}
    </div>
  );
}
