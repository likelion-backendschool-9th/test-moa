import type { Metadata } from "next";
import { Suspense } from "react";
import { requireMember } from "@/features/session/guard";
import { TossPopup, TossPopupView } from "@/app/(site)/my/(account)/subscription/checkout/_components/TossPopup/TossPopup";

export const metadata: Metadata = { title: "토스페이 결제" };

/*
 * 결제 팝업(#252)이 토스 결제창을 여는 화면. 결제 화면이 팝업을 먼저 열고 서버의 결제 준비가 끝나면 이리로 보낸다.
 * 결제창 값은 주소가 아니라 원래 창이 직접 보내 준다(TossPopup)
 */
export default function TossPopupPage() {
  return (
    <Suspense fallback={<TossPopupView text="토스 결제창을 여는 중이에요…" />}>
      <TossWindowOpener />
    </Suspense>
  );
}

async function TossWindowOpener() {
  await requireMember("/my/subscription/checkout/toss");
  return <TossPopup />;
}
