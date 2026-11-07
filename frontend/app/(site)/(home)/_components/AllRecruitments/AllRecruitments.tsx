import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { toSearchParams, type RecruitmentQuery } from "@/features/recruitment/query";
import type { RecruitmentPage } from "@/features/recruitment/types";
import { RecruitmentFilters } from "../RecruitmentFilters/RecruitmentFilters";
import { RecruitmentGrid } from "../RecruitmentGrid/RecruitmentGrid";
import styles from "./AllRecruitments.module.css";

/** 검색어·카테고리·모집 중만 보기 중 하나라도 걸렸는지. 정렬과 페이지는 결과를 줄이지 않아 조건으로 보지 않는다 */
function hasFilters(query: RecruitmentQuery) {
  return query.q !== "" || query.type !== null || query.open;
}

/** 페이지 링크는 그리드 맨 위로 간다 */
function pageHref(query: RecruitmentQuery, page: number) {
  const params = toSearchParams({ ...query, page });
  return `${params.size ? `/?${params}` : "/"}#all-tests`;
}

/** 전체 테스트. 검색 조건과 한 페이지 결과를 받아 그린다 */
export function AllRecruitments({ query, result }: { query: RecruitmentQuery; result: RecruitmentPage }) {
  return (
    <div className={styles.root}>
      <RecruitmentFilters query={query} />
      <p aria-live="polite" className={styles.text}>
        총 {result.total}개
      </p>
      {result.items.length > 0 ? (
        <>
          <RecruitmentGrid recruitments={result.items} />
          <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(page) => pageHref(query, page)} />
        </>
      ) : !hasFilters(query) ? (
        <EmptyState title="지금 모집 중인 테스트가 없어요" description="새 모집이 열리면 여기에 보여요." />
      ) : (
        <EmptyState
          title="조건에 맞는 테스트가 없어요"
          description="검색어를 바꾸거나 카테고리와 필터를 풀어 보세요."
          action={
            <LinkButton href="/" scroll={false} variant="secondary">
              조건 초기화
            </LinkButton>
          }
        />
      )}
    </div>
  );
}
