import type { Metadata } from "next";
import { Suspense } from "react";
import { requireMember } from "@/features/session/guard";
import { tossWindowFromQuery } from "@/features/subscription/pg";
import { TossPopup } from "@/app/(site)/my/(account)/subscription/checkout/_components/TossPopup/TossPopup";

export const metadata: Metadata = { title: "토스페이 결제" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/*
 * 결제 팝업(#252)이 토스 결제창을 여는 화면. 결제 화면이 팝업을 먼저 열고 서버의 결제 준비가 끝나면 준비 값을 쿼리에 담아 이리로 보낸다.
 * 금액은 승인할 때 서버가 다시 확인하므로 쿼리를 바꿔도 다른 금액으로 결제되지 않는다
 */
export default function TossPopupPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<TossPopup window={null} loading />}>
      <TossWindowOpener searchParams={searchParams} />
    </Suspense>
  );
}

async function TossWindowOpener({ searchParams }: { searchParams: SearchParams }) {
  await requireMember("/my/subscription/checkout/toss");
  return <TossPopup window={tossWindowFromQuery(await searchParams)} />;
}
