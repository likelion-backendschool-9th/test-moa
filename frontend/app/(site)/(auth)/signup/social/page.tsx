import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard, AuthFormSkeleton } from "@/app/(site)/(auth)/_components/AuthCard";
import { SocialSignupForm } from "@/app/(site)/(auth)/signup/social/_components/SocialSignupForm";
import { readSignup } from "@/features/auth/oauth";
import { isBackendAuth } from "@/lib/backend";
import { safeNextPath } from "@/lib/next-path";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "소셜 가입" };

/* 목업에서 화면을 볼 수 있게 쓰는 시연 값. 실제 로그인에서는 제공자에게서 받은 값을 쓴다 */
const DEMO_SIGNUP = { email: "social@example.com", nickname: "모아테스터" };

/* 제목은 정적 셸에 두고, 쿠키를 읽는 폼만 Suspense 안에서 스트리밍한다 */
export default function SocialSignupPage({ searchParams }: PageProps<"/signup/social">) {
  return (
    <AuthCard title="소셜 가입" description="처음 오셨네요. 이름만 입력하면 가입이 끝나요.">
      <Suspense fallback={<AuthFormSkeleton fields={1} />}>
        <SocialSignupSlot searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

/** 이미 로그인했으면 돌아갈 곳으로, 소셜 로그인을 거치지 않았거나 10분이 지났으면 로그인 화면으로 보낸다 */
async function SocialSignupSlot({ searchParams }: { searchParams: PageProps<"/signup/social">["searchParams"] }) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  if (!isBackendAuth) {
    const next = safeNextPath(params.next);
    if (session.role !== "guest") redirect(next);
    return <SocialSignupForm {...DEMO_SIGNUP} next={next} />;
  }

  const pending = await readSignup();
  if (session.role !== "guest") redirect(pending?.next ?? "/");
  if (!pending) redirect("/login?error=expired");
  return <SocialSignupForm email={pending.email} nickname={pending.nickname} next={pending.next} />;
}
