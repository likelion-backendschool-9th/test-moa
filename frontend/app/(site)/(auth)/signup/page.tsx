import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard, AuthFormSkeleton, OrDivider } from "@/app/(site)/(auth)/_components/AuthCard";
import { SignupForm } from "@/app/(site)/(auth)/signup/_components/SignupForm";
import { SocialButtons } from "@/app/(site)/(auth)/_components/SocialButtons";
import { withNext } from "@/features/auth/types";
import { safeNextPath } from "@/lib/next-path";
import { getSession } from "@/features/session/session";

export const metadata: Metadata = { title: "회원가입" };

type SearchParams = PageProps<"/signup">["searchParams"];

/* 제목은 정적 셸에 두고, 세션과 주소의 next를 읽는 폼만 Suspense 안에서 스트리밍한다 */
export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  return (
    <AuthCard title="회원가입" description="한 계정으로 테스트에 참여하고 내 서비스의 테스터도 모집할 수 있어요.">
      <Suspense fallback={<AuthFormSkeleton fields={5} />}>
        <SignupSlot searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

/** 이미 로그인했으면 돌아갈 경로로 보낸다 */
async function SignupSlot({ searchParams }: { searchParams: SearchParams }) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  const next = safeNextPath(params.next);
  if (session.role !== "guest") redirect(next);
  return (
    <>
      <SignupForm next={next} />
      <OrDivider />
      <SocialButtons next={next} />
      <p className="text-center text-sm text-text-muted">
        이미 계정이 있나요?{" "}
        <Link href={withNext("/login", next)} className="font-semibold text-text underline underline-offset-4">
          로그인
        </Link>
      </p>
    </>
  );
}
