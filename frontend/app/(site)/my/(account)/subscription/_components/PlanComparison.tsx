import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { formatWon } from "@/lib/format";
import { BENEFIT_ROWS, type PlanTerms, type SubscriptionPlan } from "@/features/subscription/types";
import { cardClass, cardTitleClass } from "../../_components/card-styles";

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
    <section aria-labelledby="plan-comparison-heading" className={cardClass}>
      <div className="flex flex-col gap-1">
        <h2 id="plan-comparison-heading" className={cardTitleClass}>
          혜택 비교
        </h2>
        <p className="text-sm text-text-muted">구독 혜택은 모집 글을 올리는 쪽에 붙어요.</p>
      </div>
      <table className="w-full table-fixed text-sm">
        <caption className="sr-only">무료와 구독 혜택 비교</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="w-[30%] py-3 pr-3 text-left align-top font-semibold text-text-muted">
              혜택
            </th>
            {columns.map((column) => (
              <th key={column.id} scope="col" className="px-3 py-3 text-left align-top">
                <span className="flex flex-col items-start gap-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-base font-extrabold">{column.name}</span>
                    {column.id === current && <Badge>지금 이용 중</Badge>}
                  </span>
                  <span className="text-xs font-semibold text-text-muted tabular-nums">{column.price}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BENEFIT_ROWS.map((row) => (
            <tr key={row.key} className="border-b border-line last:border-b-0">
              <th scope="row" className="py-3 pr-3 text-left align-top font-normal text-text-muted">
                {row.label}
              </th>
              {columns.map((column) => (
                <td key={column.id} className={cn("px-3 py-3 align-top", column.id !== FREE_ID && "font-semibold")}>
                  {row.key === "monthlyLimit" ? `월 ${column.monthlyLimit}명` : column.benefits[row.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
