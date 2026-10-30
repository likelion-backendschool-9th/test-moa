import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import type { Recruitment } from "../types";
import { RecruitmentGrid } from "./RecruitmentGrid";

/** 구독 개발자의 모집 건. 기획서의 상단 노출 혜택 자리 */
export function SubscriptionSection({ recruitments }: { recruitments: Recruitment[] }) {
  if (recruitments.length === 0) {
    return (
      <EmptyState
        title="구독하면 이 자리에 모집 글이 노출돼요"
        description="구독 개발자의 모집 글은 기본 보상에 추가 보상이 붙어 이 영역에 먼저 소개돼요."
        action={
          <LinkButton href="/my/subscription" variant="secondary">
            구독 알아보기
          </LinkButton>
        }
      />
    );
  }
  return <RecruitmentGrid recruitments={recruitments} columns="three" />;
}
