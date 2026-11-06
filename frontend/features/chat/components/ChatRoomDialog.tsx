import { type ReactNode, useEffect, useId, useRef } from "react";

type ChatRoomDialogProps = {
  title: string;
  description: ReactNode;
  /** 닫기(Esc, 바깥 클릭, 취소). 부모가 이 대화상자를 지운다 */
  onClose: () => void;
  children: ReactNode;
};

/**
 * 대화방 이름 변경·삭제 확인에 쓰는 대화상자. 화면에 그려지면 바로 모달로 열린다.
 * 브라우저 기본 <dialog>라 포커스가 안에 갇히고, 첫 조작 요소에 포커스가 가며, Esc로 닫힌다. ChatCardMenu 안에서만 쓴다.
 */
export function ChatRoomDialog({ title, description, onClose, children }: ChatRoomDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-surface-muted p-0 text-text backdrop:bg-surface/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex animate-rise-in flex-col gap-5 p-6">
        <div className="flex flex-col gap-1.5">
          <h2 id={titleId} className="text-lg font-extrabold">
            {title}
          </h2>
          <p className="text-sm text-text-muted">{description}</p>
        </div>
        {children}
      </div>
    </dialog>
  );
}
