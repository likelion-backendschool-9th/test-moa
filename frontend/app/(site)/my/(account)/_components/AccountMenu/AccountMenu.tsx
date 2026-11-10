import { Button } from "@/components/ui/Button/Button";
import { logout } from "@/features/auth/actions";
import type { LeaveNotice, LoginProvider } from "@/features/member/types";
import { AccountCard, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import { LeaveAccountButton } from "@/app/(site)/my/(account)/_components/LeaveAccountButton/LeaveAccountButton";
import styles from "./AccountMenu.module.css";

const PROVIDER_LABEL: Record<LoginProvider, string> = { LOCAL: "이메일·비밀번호", GOOGLE: "구글", GITHUB: "깃허브" };

type AccountMenuProps = {
  notice: LeaveNotice;
  /** 로그인한 계정의 이메일. "로그인 방법 이메일"만 있으면 주소가 빠진 것처럼 보여서 함께 보인다 */
  email: string;
  /** 연동된 로그인 방식. 목업에는 없어서 이메일로 본다 */
  providers?: LoginProvider[];
};

/**
 * 계정(#84, D안). 로그인 방법과 로그아웃·회원 탈퇴. 개인정보 수정은 왼쪽 메뉴에 있어서 두지 않는다.
 * 되돌리기 어려운 탈퇴는 맨 아래 카드에 두되, 찾기 쉽게 로그아웃과 같은 모양의 버튼으로 둔다
 */
export function AccountMenu({ notice, email, providers = ["LOCAL"] }: AccountMenuProps) {
  return (
    <AccountCard as="section" aria-labelledby="account-heading">
      <AccountCardTitle id="account-heading">계정</AccountCardTitle>
      <dl className={styles.info}>
        <dt className={styles.label}>이메일</dt>
        <dd className={styles.value}>{email}</dd>
        <dt className={styles.label}>로그인 방법</dt>
        <dd className={styles.value}>{providers.map((provider) => PROVIDER_LABEL[provider]).join(" · ")}</dd>
      </dl>
      <div className={styles.footer}>
        <p className={styles.note}>탈퇴해도 30일 안에는 되돌릴 수 있어요.</p>
        <div className={styles.actions}>
          <form action={logout}>
            <Button type="submit" variant="secondary">
              로그아웃
            </Button>
          </form>
          <LeaveAccountButton {...notice} />
        </div>
      </div>
    </AccountCard>
  );
}
