import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import type { RecruitmentQuery } from "../query";
import type { Recruitment } from "../types";
import { RecruitmentFilters } from "./RecruitmentFilters";
import { RecruitmentGrid } from "./RecruitmentGrid";

/** 전체 테스트. 검색 조건과 결과를 받아 그린다 */
export function AllRecruitments({ query, recruitments }: { query: RecruitmentQuery; recruitments: Recruitment[] }) {
  return (
    <div className="flex flex-col gap-8">
      <RecruitmentFilters query={query} />
      <p aria-live="polite" className="text-sm font-semibold text-text-muted">
        {recruitments.length}개
      </p>
      {recruitments.length > 0 ? (
        <RecruitmentGrid recruitments={recruitments} />
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
