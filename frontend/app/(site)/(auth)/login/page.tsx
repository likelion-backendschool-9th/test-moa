import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormMessage } from "@/components/ui/FormField/FormField";
import { AuthCard, AuthFormSkeleton, OrDivider } from "@/app/(site)/(auth)/_components/AuthCard/AuthCard";
import { LoginForm } from "@/app/(site)/(auth)/login/_components/LoginForm/LoginForm";
import { SocialButtons } from "@/app/(site)/(auth)/_components/SocialButtons/SocialButtons";
import { OAUTH_ERRORS, type OAuthErrorKey, readRestore } from "@/features/auth/oauth";
import { RestorePrompt } from "@/app/(site)/(auth)/login/_components/RestorePrompt/RestorePrompt";
import { withNext } from "@/features/auth/types";
import { getDemoAccounts } from "@/features/member/api";
import { isBackendAuth } from "@/lib/backend";
import { formatDate } from "@/lib/format";
import { safeNextPath } from "@/lib/next-path";
import { getSession } from "@/features/session/session";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "로그인" };

type SearchParams = PageProps<"/login">["searchParams"];

const ROLE_LABEL = { tester: "테스터", developer: "개발자", admin: "운영자" } as const;

/* 제목은 정적 셸에 두고, 세션과 주소의 next를 읽는 폼만 Suspense 안에서 스트리밍한다 */
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthCard
      title="로그인"
      description="테스트에 참여하거나 모집 글을 올리려면 로그인해 주세요."
      after={isBackendAuth ? undefined : <DemoAccounts />}
    >
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
  /* 소셜 로그인 실패(/auth/callback에서 돌아옴). 주소에는 키만 있고 문구는 여기서 고른다. constructor 같은 객체 기본 이름은 무시한다 */
  const oauthError =
    typeof params.error === "string" && Object.hasOwn(OAUTH_ERRORS, params.error) ? OAUTH_ERRORS[params.error as OAuthErrorKey] : undefined;
  /* 탈퇴 유예 계정의 로그인(#84). 되돌리기 토큰은 쿠키에 있고, 로그인 화면 위에 창을 바로 띄운다 */
  const restore = params.restore === "1" ? await readRestore() : undefined;
  return (
    <>
      {restore && (
        <RestorePrompt nickname={restore.nickname || undefined} purgeDate={restore.purgeAt ? formatDate(restore.purgeAt) : undefined} />
      )}
      {params.joined === "1" && <FormMessage status="success" message="가입했어요. 로그인해 주세요" />}
      {params.left === "1" && <FormMessage status="success" message="탈퇴했어요. 30일 안에 다시 로그인하면 되돌릴 수 있어요" />}
      {oauthError && <FormMessage status="error" message={oauthError} />}
      <LoginForm next={next} />
      <OrDivider />
      <SocialButtons next={next} />
      <p className={styles.loginSlotText}>
        계정이 없나요?{" "}
        <Link href={withNext("/signup", next)} className={styles.loginSlotLink}>
          회원가입
        </Link>
      </p>
    </>
  );
}

/** 시연용 계정 안내. 목업이라 세 회원 모두 같은 비밀번호를 쓴다. 실제 백엔드 로그인(AUTH_MODE=backend)에서는 숨긴다 */
function DemoAccounts() {
  const { accounts, password } = getDemoAccounts();
  return (
    <section aria-labelledby="demo-accounts-heading" className={styles.demoAccounts}>
      <h2 id="demo-accounts-heading" className={styles.demoAccountsTitle}>
        시연 계정
      </h2>
      <ul className={styles.demoAccountsList}>
        {accounts.map((account) => (
          <li key={account.role}>
            {ROLE_LABEL[account.role]} · <span className={styles.demoAccountsEmail}>{account.email}</span>
          </li>
        ))}
      </ul>
      <p>
        비밀번호는 모두 <span className={styles.demoAccountsPassword}>{password}</span>
      </p>
    </section>
  );
}
