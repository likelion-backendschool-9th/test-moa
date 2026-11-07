import type { ReactNode } from "react";
import type { Recruitment } from "@/features/recruitment/types";
import { RecruitmentGrid, RecruitmentGridSkeleton } from "./RecruitmentGrid";

/** 영역 틀. 제목은 테스터에게 좋은 점(추가 보상)을 말하고 '구독'이라는 말은 쓰지 않는다 */
function SubscriptionFrame({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="subscription-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="subscription-heading" className="text-2xl font-extrabold tracking-[-0.03em]">
          이런 테스트도 있어요
        </h2>
        <p className="text-sm text-text-muted">기본 보상에 추가 보상이 붙는 테스트예요.</p>
      </div>
      {children}
    </section>
  );
}

/**
 * 구독 개발자의 모집 건. 기획서의 상단 노출 혜택 자리.
 * 글이 없으면 영역을 통째로 그리지 않는다. 테스터와 개발자는 같은 계정이라 역할로 문구를 나누지 않는다.
 */
export function SubscriptionSection({ recruitments }: { recruitments: Recruitment[] }) {
  if (recruitments.length === 0) return null;
  return (
    <SubscriptionFrame>
      <RecruitmentGrid recruitments={recruitments} columns="three" />
    </SubscriptionFrame>
  );
}

export function SubscriptionSectionSkeleton() {
  return (
    <SubscriptionFrame>
      <RecruitmentGridSkeleton count={3} columns="three" />
    </SubscriptionFrame>
  );
}
