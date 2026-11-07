import { Badge } from "@/components/ui/Badge/Badge";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { formatDate } from "@/lib/format";
import type { Subscription } from "@/features/subscription/types";
import { AccountCard, AccountCardHeader, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./SubscriptionCard.module.css";

/** 계정 단위 구독 상태. 가격과 주기는 기획에서 미정이라 보여 주지 않는다 */
export function SubscriptionCard({ subscription }: { subscription: Subscription }) {
  const active = subscription.status === "active";
  return (
    <AccountCard as="section" aria-labelledby="my-subscription-heading">
      <AccountCardHeader>
        <AccountCardTitle id="my-subscription-heading">
          구독
        </AccountCardTitle>
        <LinkButton href="/my/subscription" variant="secondary" size="sm">
          {active ? "구독 관리" : "구독 알아보기"}
        </LinkButton>
      </AccountCardHeader>
      {active ? (
        <div className={styles.box}>
          <Badge tone="accent">구독 중</Badge>
          <p className={styles.text}>{formatDate(subscription.expiresAt)} 만료</p>
          <p className={styles.text2}>만료일까지 구독 혜택을 그대로 쓸 수 있어요.</p>
        </div>
      ) : (
        <div className={styles.box2}>
          <p className={styles.text3}>구독하지 않았어요</p>
          <p className={styles.text4}>구독하면 모집 글 상단 노출, 테스터 직접 선정, 채팅을 쓸 수 있어요.</p>
        </div>
      )}
    </AccountCard>
  );
}
