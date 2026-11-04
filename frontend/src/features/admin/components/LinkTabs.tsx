import Link from "next/link";
import { cn } from "@/lib/cn";

type LinkTabsProps<T extends string> = {
  /** 탭 묶음 이름. "신고 상태", "회원 필터" */
  label: string;
  tabs: { tab: T; label: string; href: string }[];
  /** tabs의 값만 받아서, 오타가 있으면 아무 탭도 선택되지 않는 대신 타입 검사에서 걸린다 */
  current: NoInfer<T>;
};

/**
 * 처리 대기·처리 완료 탭이나 회원 필터처럼 링크로 고르는 탭. 고른 값은 URL(tab, filter)에 남는다.
 * 탭이 많아 좁은 화면을 넘치면 페이지 대신 이 줄만 가로로 스크롤한다.
 */
export function LinkTabs<T extends string>({ label, tabs, current }: LinkTabsProps<T>) {
  return (
    <nav aria-label={label} className="overflow-x-auto">
      <ul className="flex gap-2 whitespace-nowrap">
        {tabs.map((item) => {
          const active = item.tab === current;
          return (
            <li key={item.tab}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex rounded-full px-4 py-2 text-sm font-bold transition-colors duration-300 ease-brand",
                  active ? "bg-text text-surface" : "bg-surface-strong text-text hover:bg-line",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
