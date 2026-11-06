"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useId, useLayoutEffect, useRef } from "react";

type WithdrawalModalProps = {
  title: string;
  /** 닫기·Esc가 가는 목록 주소(open 없음) */
  closeHref: string;
  /** 닫은 뒤 포커스를 되돌릴 목록 행 키 */
  withdrawalKey: string;
  children: ReactNode;
};

/** 처리 양식에 고른 값이나 메모가 있으면 Esc로 닫기 전에 확인한다 */
function hasUnsavedInput(dialog: HTMLDialogElement) {
  if (dialog.querySelector<HTMLInputElement>("input[name=decision]:checked")) return true;
  const memo = dialog.querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea[name=memo], input[name=memo]");
  return Boolean(memo?.value.trim());
}

/**
 * 출금 요청 처리 모달. 주소의 ?open= 으로 열리고, 닫으면 open을 뺀 목록으로 간다.
 * 브라우저 기본 dialog(showModal)로 포커스 가둠·Esc를 쓰고, 배경 스크롤은
 * body를 `position: fixed`로 고정해 잠근다(`overflow: hidden`은 스크롤 위치를 깎아서 쓰지 않는다).
 * 바깥 클릭으로는 닫지 않는다.
 * 긴 모달은 위에서부터 스크롤되고, 짧은 모달은 md에서 세로 가운데에 온다(items-start + md:my-auto).
 */
export function WithdrawalModal({ title, closeHref, withdrawalKey, children }: WithdrawalModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const skipCloseNav = useRef(false);
  const scrollYRef = useRef(0);
  const titleId = useId();
  const router = useRouter();

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const scrollY = window.scrollY;
    scrollYRef.current = scrollY;
    const { body } = document;
    const previous = body.style.cssText;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    if (!dialog.open) dialog.showModal();
    return () => {
      body.style.cssText = previous;
      /* bfcache·언마운트 때 열린 dialog를 닫아, 다시 보일 때 showModal()이 실패하지 않게 한다 */
      if (dialog.open) {
        skipCloseNav.current = true;
        dialog.close();
      }
      /* CSS의 smooth 스크롤을 따르지 않아야 다음 layout effect도 복원된 위치를 읽는다. */
      window.scrollTo({ top: scrollYRef.current, left: 0, behavior: "instant" });
    };
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const node = dialog;
    function onCancel(event: Event) {
      if (!hasUnsavedInput(node)) return;
      if (!window.confirm("작성 중인 내용이 사라집니다. 닫을까요?")) event.preventDefault();
    }
    node.addEventListener("cancel", onCancel);
    return () => node.removeEventListener("cancel", onCancel);
  }, []);

  function closeModal() {
    const dialog = ref.current;
    if (!dialog) return;
    if (hasUnsavedInput(dialog) && !window.confirm("작성 중인 내용이 사라집니다. 닫을까요?")) return;
    dialog.close();
  }

  function restoreFocus() {
    /* preventScroll: 포커스가 목록 스크롤을 다시 움직이지 않게 한다(#42-S7) */
    const row = document.querySelector<HTMLElement>(`[data-withdrawal-key="${withdrawalKey}"]`);
    if (row) {
      row.focus({ preventScroll: true });
      return;
    }
    /* 목록에 없는 요청(다른 탭의 처리 건 등)을 열었다 닫으면 행이 없다. 상태 탭으로 보낸다 */
    document.querySelector<HTMLElement>('[aria-label="출금 요청 상태"] a')?.focus({ preventScroll: true });
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        if (skipCloseNav.current) {
          skipCloseNav.current = false;
          return;
        }
        /* 스크롤 복원은 layout effect cleanup에서 한 번만 한다 */
        router.replace(closeHref, { scroll: false });
        requestAnimationFrame(() => requestAnimationFrame(restoreFocus));
      }}
      /* 앞의 flex를 두면 닫힌 dialog의 display:none을 덮어써서 화면에 남는다. open일 때만 flex */
      className="fixed inset-0 m-0 h-dvh max-h-dvh w-full max-w-none items-start justify-center overflow-y-auto overscroll-contain border-0 bg-transparent p-4 text-text open:flex md:p-6 backdrop:bg-surface/80 backdrop:backdrop-blur-sm"
    >
      <div className="my-4 w-full max-w-3xl animate-rise-in rounded-2xl bg-surface p-6 md:my-auto md:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-2xl font-extrabold tracking-[-0.03em]">
              {title}
            </h2>
            <button
              type="button"
              className="shrink-0 text-sm font-semibold text-text-muted hover:text-text"
              onClick={closeModal}
            >
              닫기
            </button>
          </div>
          {children}
        </div>
      </div>
    </dialog>
  );
}
