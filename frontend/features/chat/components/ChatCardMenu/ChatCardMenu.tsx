"use client";

import { DotsThreeIcon } from "@phosphor-icons/react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/Button/Button";
import { cn } from "@/lib/cn";
import { deleteChatRoomAction, renameChatRoomAction } from "@/features/chat/actions";
import { CHAT_ROOM_NAME_MAX } from "@/features/chat/types";
import { ChatRoomDialog } from "@/features/chat/components/ChatRoomDialog/ChatRoomDialog";

type ChatCardMenuProps = {
  roomKey: string;
  /** 카드에 보이는 대화방 이름 */
  title: string;
  /** 채팅방 안에서 쓸 때 true. 삭제하면 채팅함으로 돌아간다 */
  leaveOnDelete?: boolean;
  /** 놓이는 자리에 맞춘 바깥 여백 */
  className?: string;
};

type DialogKind = "rename" | "delete";

const itemClass =
  "flex w-full rounded-lg px-3 py-2 text-left text-sm font-semibold whitespace-nowrap transition-colors duration-300 ease-brand hover:bg-surface-strong focus:bg-surface-strong";

function menuItems(root: HTMLElement | null) {
  return [...(root?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
}

/**
 * 지운 카드가 목록에서 빠지면(서버가 다시 그린 목록이 반영되면) 이웃 카드로 포커스를 옮긴다.
 * 그 전에 옮기면 아직 열린 대화상자나 사라질 카드 때문에 포커스가 문서 처음으로 돌아간다. 약 2초가 지나도 남아 있으면 그만둔다.
 */
function focusAfterRemoval(item: Element, target: HTMLElement, frames = 120) {
  if (!item.isConnected) target.focus();
  else if (frames > 0) requestAnimationFrame(() => focusAfterRemoval(item, target, frames - 1));
}

/**
 * 채팅 카드와 채팅방 머리의 더보기 메뉴. "대화방 이름 변경", 구분선, "대화방 삭제" 순서이고 삭제는 맨 아래다.
 * 열면 첫 항목으로 포커스가 가고, 위아래 화살표·Home·End로 옮기며, Esc는 닫고 버튼으로 돌아가고, Tab·바깥 클릭은 닫기만 한다.
 * 항목을 고르면 대화상자를 열고, 저장·삭제는 서버 액션으로 보낸다.
 */
export function ChatCardMenu({ roomKey, title, leaveOnDelete = false, className }: ChatCardMenuProps) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const inputId = useId();

  /*
   * 다른 화면으로 가서 숨겨지면 메뉴와 대화상자를 닫는다. 떠난 화면은 상태째 보존되어, 그대로 두면 돌아왔을 때
   * 메뉴가 열려 있거나 이미 열린 대화상자를 다시 모달로 열다 오류가 나고 화면 조작이 막힌다.
   */
  useLayoutEffect(() => {
    return () => {
      setOpen(false);
      setDialog(null);
    };
  }, []);

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
    /* 채팅함에서는 카드가 사라지며 포커스가 문서 처음으로 가므로, 다음(없으면 이전) 카드 링크로 옮긴다 */
    const item = rootRef.current?.closest("li");
    const neighbor = (item?.nextElementSibling ?? item?.previousElementSibling)?.querySelector<HTMLElement>("a[href]");
    startTransition(async () => {
      await deleteChatRoomAction(roomKey, leaveOnDelete);
      setDialog(null);
      if (item && neighbor) focusAfterRemoval(item, neighbor);
    });
  }

  return (
    <div ref={rootRef} onKeyDown={onKeyDown} className={cn("relative shrink-0", className)}>
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
        <ChatRoomDialog title="대화방 이름 변경" description="채팅함과 채팅방에 보이는 이름을 바꿔요." onClose={closeDialog}>
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
