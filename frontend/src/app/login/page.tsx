import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormMessage } from "@/components/ui/FormField";
import { AuthCard, AuthFormSkeleton, OrDivider } from "@/features/auth/components/AuthCard";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { SocialButtons } from "@/features/auth/components/SocialButtons";
import { withNext } from "@/features/auth/types";
import { getDemoAccounts } from "@/features/member/api";
import { safeNextPath } from "@/lib/next-path";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "로그인" };

type SearchParams = PageProps<"/login">["searchParams"];

const ROLE_LABEL = { tester: "테스터", developer: "개발자", admin: "운영자" } as const;

/* 제목은 정적 셸에 두고, 세션과 주소의 next를 읽는 폼만 Suspense 안에서 스트리밍한다 */
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthCard title="로그인" description="테스트에 참여하거나 모집 글을 올리려면 로그인해 주세요." after={<DemoAccounts />}>
      <Suspense fallback={<AuthFormSkeleton fields={2} />}>
        <LoginSlot searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

/** 이미 로그인했으면 돌아갈 경로로 보낸다 */
async function LoginSlot({ searchParams }: { searchParams: SearchParams }) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  const next = safeNextPath(params.next);
  if (session.role !== "guest") redirect(next);
  return (
    <>
      {params.joined === "1" && <FormMessage status="success" message="가입했어요. 로그인해 주세요" />}
      <LoginForm next={next} />
      <OrDivider />
      <SocialButtons next={next} />
      <p className="text-center text-sm text-text-muted">
        계정이 없나요?{" "}
        <Link href={withNext("/signup", next)} className="font-semibold text-text underline underline-offset-4">
          회원가입
        </Link>
      </p>
    </>
  );
}

/** 시연용 계정 안내. 목업이라 세 회원 모두 같은 비밀번호를 쓴다 */
function DemoAccounts() {
  const { accounts, password } = getDemoAccounts();
  return (
    <section aria-labelledby="demo-accounts-heading" className="flex flex-col gap-2 px-6 text-sm text-text-muted md:px-8">
      <h2 id="demo-accounts-heading" className="font-semibold text-text">
        시연 계정
      </h2>
      <ul className="flex flex-col gap-1">
        {accounts.map((account) => (
          <li key={account.role}>
            {ROLE_LABEL[account.role]} · <span className="text-text">{account.email}</span>
          </li>
        ))}
      </ul>
      <p>
        비밀번호는 모두 <span className="font-semibold text-text">{password}</span>
      </p>
    </section>
  );
}
