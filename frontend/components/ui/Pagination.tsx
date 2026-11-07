import Link from "next/link";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/cn";

type PaginationProps = {
  page: number;
  pageCount: number;
  /** 페이지 번호로 이동할 주소를 만든다 */
  hrefFor: (page: number) => string;
  className?: string;
};

const itemClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full px-3 text-sm font-bold tabular-nums transition-colors duration-300 ease-brand";

/** 번호식 페이지 탐색. 한 페이지뿐이면 그리지 않는다 */
export function Pagination({ page, pageCount, hrefFor, className }: PaginationProps) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <nav aria-label="페이지" className={cn("flex justify-center", className)}>
      <ul className="flex flex-wrap items-center gap-1">
        {page > 1 && (
          <li>
            <Link href={hrefFor(page - 1)} className={cn(itemClass, "text-text hover:bg-surface-strong")}>
              <CaretLeftIcon aria-hidden size={16} weight="bold" />
              이전
            </Link>
          </li>
        )}
        {pages.map((value) => (
          <li key={value}>
            <Link
              href={hrefFor(value)}
              aria-current={value === page ? "page" : undefined}
              className={cn(itemClass, value === page ? "bg-text text-surface" : "text-text hover:bg-surface-strong")}
            >
              {value}
            </Link>
          </li>
        ))}
        {page < pageCount && (
          <li>
            <Link href={hrefFor(page + 1)} className={cn(itemClass, "text-text hover:bg-surface-strong")}>
              다음
              <CaretRightIcon aria-hidden size={16} weight="bold" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
