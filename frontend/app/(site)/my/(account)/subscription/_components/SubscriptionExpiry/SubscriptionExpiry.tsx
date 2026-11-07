import { EXPIRY_KEEPS, EXPIRY_STOPS } from "@/features/subscription/types";
import { AccountCard, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./SubscriptionExpiry.module.css";

const GROUPS = [
  { id: "keeps", title: "그대로 남아요", items: EXPIRY_KEEPS },
  { id: "stops", title: "멈춰요", items: EXPIRY_STOPS },
];

/** 구독 중인 회원에게 만료 뒤 바뀌는 점을 알려 준다 */
export function SubscriptionExpiry() {
  return (
    <AccountCard as="section" aria-labelledby="subscription-expiry-heading">
      <AccountCardTitle id="subscription-expiry-heading">
        만료되면
      </AccountCardTitle>
      <div className={styles.box}>
        {GROUPS.map((group) => (
          <div key={group.id} className={styles.root}>
            <h3 id={`subscription-expiry-${group.id}`} className={styles.title}>
              {group.title}
            </h3>
            <ul aria-labelledby={`subscription-expiry-${group.id}`} className={styles.list}>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </AccountCard>
  );
}
