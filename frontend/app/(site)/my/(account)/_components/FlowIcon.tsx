import { cn } from "@/lib/cn";

/** 내역 행 왼쪽의 받음(+)·나감(−) 원. 뜻은 금액 부호로도 읽히므로 보조 기술에는 숨긴다 */
export function FlowIcon({ incoming }: { incoming: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full text-base font-extrabold",
        incoming ? "bg-accent-soft text-accent" : "bg-surface-strong text-text",
      )}
    >
      {incoming ? "+" : "−"}
    </span>
  );
}
