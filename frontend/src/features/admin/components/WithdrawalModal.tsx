"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useId, useRef } from "react";

type WithdrawalModalProps = {
  title: string;
  /** 닫기·Esc가 가는 목록 주소(open 없음) */
  closeHref: string;
  /** 닫은 뒤 포커스를 되돌릴 목록 행 키 */
  withdrawalKey: string;
  children: ReactNode;
};

/**
 * 출금 요청 처리 모달. 주소의 ?open= 으로 열리고, 닫으면 open을 뺀 목록으로 간다.
 * 브라우저 기본 dialog(showModal)라 포커스 가둠·Esc·배경 비활성화·스크롤 잠금은 브라우저가 한다.
 * 바깥 클릭으로는 닫지 않는다(처리 양식 입력을 잃지 않기 위해).
 * 긴 모달은 위에서부터 스크롤되고, 짧은 모달은 md에서 세로 가운데에 온다(items-start + md:my-auto).
 */
export function WithdrawalModal({ title, closeHref, withdrawalKey, children }: WithdrawalModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const router = useRouter();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
  }, []);

  function closeModal() {
    ref.current?.close();
  }

  function restoreFocus() {
    const row = document.querySelector<HTMLElement>(`[data-withdrawal-key="${withdrawalKey}"]`);
    row?.focus();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        router.replace(closeHref);
        /* 목록이 다시 그려진 뒤 행으로 포커스를 돌린다 */
        requestAnimationFrame(() => requestAnimationFrame(restoreFocus));
      }}
      /* 앞의 flex를 두면 닫힌 dialog의 display:none을 덮어써서 화면에 남는다. open일 때만 flex */
      className="fixed inset-0 m-0 h-dvh max-h-dvh w-full max-w-none items-start justify-center overflow-y-auto border-0 bg-transparent p-4 text-text open:flex md:p-6 backdrop:bg-surface/80 backdrop:backdrop-blur-sm"
    >
      <div className="my-4 w-full max-w-3xl animate-rise-in rounded-2xl bg-surface p-6 md:my-auto md:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-2xl font-extrabold tracking-[-0.03em]">
              {title}
            </h2>
            <Link
              href={closeHref}
              replace
              className="shrink-0 text-sm font-semibold text-text-muted hover:text-text"
              onClick={(event) => {
                event.preventDefault();
                closeModal();
              }}
            >
              닫기
            </Link>
          </div>
          {children}
        </div>
      </div>
    </dialog>
  );
}
