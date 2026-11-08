import Link from "next/link";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/cn";
import styles from "./Pagination.module.css";

type PaginationProps = {
  page: number;
  pageCount: number;
  /** 페이지 번호로 이동할 주소를 만든다 */
  hrefFor: (page: number) => string;
  className?: string;
};

/** 번호식 페이지 탐색. 한 페이지뿐이면 그리지 않는다 */
export function Pagination({ page, pageCount, hrefFor, className }: PaginationProps) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <nav aria-label="페이지" className={cn(styles.root, className)}>
      <ul className={styles.list}>
        {page > 1 && (
          <li>
            <Link href={hrefFor(page - 1)} className={cn(styles.item, styles.link)}>
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
              className={cn(styles.item, value === page ? styles.valueOn : styles.valueOff)}
            >
              {value}
            </Link>
          </li>
        ))}
        {page < pageCount && (
          <li>
            <Link href={hrefFor(page + 1)} className={cn(styles.item, styles.link2)}>
              다음
              <CaretRightIcon aria-hidden size={16} weight="bold" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
