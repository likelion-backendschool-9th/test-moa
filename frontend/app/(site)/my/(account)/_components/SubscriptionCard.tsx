import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { formatDate } from "@/lib/format";
import type { Subscription } from "../../../../../features/my/types";
import { cardClass, cardHeaderClass, cardTitleClass } from "./card-styles";

/** 계정 단위 구독 상태. 가격과 주기는 기획에서 미정이라 보여 주지 않는다 */
export function SubscriptionCard({ subscription }: { subscription: Subscription }) {
  const active = subscription.status === "active";
  return (
    <section aria-labelledby="my-subscription-heading" className={cardClass}>
      <div className={cardHeaderClass}>
        <h2 id="my-subscription-heading" className={cardTitleClass}>
          구독
        </h2>
        <LinkButton href="/my/subscription" variant="secondary" size="sm">
          {active ? "구독 관리" : "구독 알아보기"}
        </LinkButton>
      </div>
      {active ? (
        <div className="flex flex-col items-start gap-2">
          <Badge tone="accent">구독 중</Badge>
          <p className="text-2xl font-extrabold tracking-[-0.03em]">{formatDate(subscription.expiresAt)} 만료</p>
          <p className="text-base text-text-muted">만료일까지 구독 혜택을 그대로 쓸 수 있어요.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-extrabold tracking-[-0.03em]">구독하지 않았어요</p>
          <p className="text-base text-text-muted">구독하면 모집 글 상단 노출, 테스터 직접 선정, 채팅을 쓸 수 있어요.</p>
        </div>
      )}
    </section>
  );
}
