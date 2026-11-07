import { Badge } from "@/components/ui/Badge/Badge";
import { cn } from "@/lib/cn";
import { formatWon } from "@/lib/format";
import { BENEFIT_ROWS, type PlanTerms, type SubscriptionPlan } from "@/features/subscription/types";
import { AccountCard, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./PlanComparison.module.css";

type Column = PlanTerms & { id: string; name: string; price: string };

const FREE_ID = "free";

/** 무료와 구독 상품의 혜택 비교. 열은 무료 + 상품 목록이고, 지금 내 상태의 열에 "지금 이용 중"을 붙인다 */
export function PlanComparison({
  freePlan,
  plans,
  currentPlanId,
}: {
  freePlan: PlanTerms;
  plans: SubscriptionPlan[];
  currentPlanId: string | null;
}) {
  const columns: Column[] = [
    { ...freePlan, id: FREE_ID, name: "무료", price: formatWon(0) },
    ...plans.map((plan) => ({ ...plan, price: `${plan.periodDays}일 ${formatWon(plan.cashPrice)}` })),
  ];
  const current = currentPlanId ?? FREE_ID;
  return (
    <AccountCard as="section" aria-labelledby="plan-comparison-heading">
      <div className={styles.box}>
        <AccountCardTitle id="plan-comparison-heading">
          혜택 비교
        </AccountCardTitle>
        <p className={styles.text}>구독 혜택은 모집 글을 올리는 쪽에 붙어요.</p>
      </div>
      <table className={styles.table}>
        <caption className={styles.srOnly}>무료와 구독 혜택 비교</caption>
        <thead>
          <tr className={styles.row}>
            <th scope="col" className={styles.cell}>
              혜택
            </th>
            {columns.map((column) => (
              <th key={column.id} scope="col" className={styles.root}>
                <span className={styles.label}>
                  <span className={styles.label2}>
                    <span className={styles.name}>{column.name}</span>
                    {column.id === current && <Badge>지금 이용 중</Badge>}
                  </span>
                  <span className={styles.price}>{column.price}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BENEFIT_ROWS.map((row) => (
            <tr key={row.key} className={styles.root2}>
              <th scope="row" className={styles.label3}>
                {row.label}
              </th>
              {columns.map((column) => (
                <td key={column.id} className={cn(styles.root3, column.id !== FREE_ID && styles.root3On)}>
                  {row.key === "monthlyLimit" ? `월 ${column.monthlyLimit}명` : column.benefits[row.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </AccountCard>
  );
}
