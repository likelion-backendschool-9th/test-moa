import { EXPIRY_KEEPS, EXPIRY_STOPS } from "@/features/subscription/types";
import { cardClass, cardTitleClass } from "../../_components/card-styles";

const GROUPS = [
  { id: "keeps", title: "그대로 남아요", items: EXPIRY_KEEPS },
  { id: "stops", title: "멈춰요", items: EXPIRY_STOPS },
];

/** 구독 중인 회원에게 만료 뒤 바뀌는 점을 알려 준다 */
export function SubscriptionExpiry() {
  return (
    <section aria-labelledby="subscription-expiry-heading" className={cardClass}>
      <h2 id="subscription-expiry-heading" className={cardTitleClass}>
        만료되면
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {GROUPS.map((group) => (
          <div key={group.id} className="flex flex-col gap-2 rounded-xl bg-surface p-4">
            <h3 id={`subscription-expiry-${group.id}`} className="text-sm font-extrabold">
              {group.title}
            </h3>
            <ul aria-labelledby={`subscription-expiry-${group.id}`} className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
