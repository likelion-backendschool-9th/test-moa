import { Button } from "@/components/ui/Button/Button";
import { FormMessage } from "@/components/ui/FormField/FormField";
import { SettingsBody, SettingsSection } from "@/components/ui/SettingsCard/SettingsCard";
import { AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import { linkSocialAccount } from "@/features/auth/actions";
import { unlinkSocialAccount } from "@/features/member/actions";
import type { LoginProvider } from "@/features/member/types";
import styles from "./LinkedAccounts.module.css";

const ACCOUNTS = [
  { id: "google", provider: "GOOGLE", label: "구글" },
  { id: "github", provider: "GITHUB", label: "깃허브" },
] as const;

/* 주소에는 키만 두고 문구는 여기서 고른다. 모르는 키는 무시한다 */
const ERRORS: Record<string, string> = {
  ACCOUNT_ALREADY_LINKED: "다른 회원에 이미 연동된 계정이에요",
  PROVIDER_ALREADY_LINKED: "같은 서비스의 다른 계정이 이미 연동돼 있어요",
  LAST_LOGIN_METHOD: "마지막 로그인 방법은 해제할 수 없어요. 비밀번호를 먼저 만들어 주세요",
  oauth: "연동하지 못했어요. 다시 시도해 주세요",
};

type Notice = { linked?: string; unlinked?: string; accountError?: string };

function message(notice: Notice): { status: "success" | "error"; text: string } | null {
  const label = (id?: string) => ACCOUNTS.find((account) => account.id === id)?.label;
  if (label(notice.linked)) return { status: "success", text: `${label(notice.linked)} 계정을 연동했어요` };
  if (label(notice.unlinked)) return { status: "success", text: `${label(notice.unlinked)} 연동을 해제했어요` };
  if (notice.accountError) {
    return { status: "error", text: Object.hasOwn(ERRORS, notice.accountError) ? ERRORS[notice.accountError] : ERRORS.oauth };
  }
  return null;
}

/** 연동된 로그인 방식(#84). 실제 로그인에서만 보인다. 연동은 동의 화면을 거치고, 해제는 바로 한다 */
export function LinkedAccounts({ providers, notice }: { providers: LoginProvider[]; notice: Notice }) {
  const result = message(notice);
  return (
    <SettingsSection aria-labelledby="linked-accounts-heading">
      <div className={styles.box}>
        <AccountCardTitle id="linked-accounts-heading">연동된 계정</AccountCardTitle>
        <p className={styles.text}>연동한 구글·깃허브 계정으로도 로그인할 수 있어요.</p>
      </div>
      <SettingsBody>
        {result && <FormMessage status={result.status} message={result.text} />}
        <ul className={styles.list}>
          {ACCOUNTS.map((account) => {
            const linked = providers.includes(account.provider);
            return (
              <li key={account.id} className={styles.row}>
                <span className={styles.name}>
                  {account.label}
                  <span className={styles.state}>{linked ? "연동됨" : "연동 안 됨"}</span>
                </span>
                <form action={linked ? unlinkSocialAccount : linkSocialAccount}>
                  <input type="hidden" name="provider" value={account.id} />
                  <Button type="submit" variant="secondary" size="sm" aria-label={`${account.label} ${linked ? "연동 해제" : "연동하기"}`}>
                    {linked ? "해제" : "연동하기"}
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      </SettingsBody>
    </SettingsSection>
  );
}
