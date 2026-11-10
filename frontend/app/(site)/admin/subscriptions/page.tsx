import { Suspense } from "react";
import { redirect } from "next/navigation";
import { parseMemberEmail } from "@/features/subscription/types";
import { planTabHref } from "@/features/subscription/paths";

/** 운영자 구독 관리는 플랜 관리의 "회원 구독" 탭으로 옮겼다(#257). 예전 주소와 검색 주소가 그대로 열리게 넘겨 준다 */
export default function SubscriptionsRedirectPage({ searchParams }: PageProps<"/admin/subscriptions">) {
  return (
    <Suspense fallback={null}>
      <Redirect searchParams={searchParams} />
    </Suspense>
  );
}

async function Redirect({ searchParams }: { searchParams: PageProps<"/admin/subscriptions">["searchParams"] }): Promise<never> {
  redirect(planTabHref("subscriptions", parseMemberEmail((await searchParams).email)));
}
