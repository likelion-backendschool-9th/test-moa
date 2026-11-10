import { GithubLogoIcon, GoogleLogoIcon } from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { FormMessage } from "@/components/ui/FormField/FormField";
import { SettingsBody, SettingsSection } from "@/components/ui/SettingsCard/SettingsCard";
import { AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import { linkSocialAccount } from "@/features/auth/actions";
import { unlinkSocialAccount } from "@/features/member/actions";
import type { LoginProvider } from "@/features/member/types";
import styles from "./LinkedAccounts.module.css";

const ACCOUNTS = [
  { id: "google", provider: "GOOGLE", label: "구글", Icon: GoogleLogoIcon },
  { id: "github", provider: "GITHUB", label: "깃허브", Icon: GithubLogoIcon },
] as const;

/* 주소에는 키만 두고 문구는 여기서 고른다. 모르는 키는 연동·해제 각각의 일반 문구로 보인다 */
const LINK_ERRORS: Record<string, string> = {
  ACCOUNT_ALREADY_LINKED: "다른 회원에 이미 연동된 계정이에요",
  PROVIDER_ALREADY_LINKED: "같은 서비스의 다른 계정이 이미 연동돼 있어요",
  oauth: "연동하지 못했어요. 다시 시도해 주세요",
};
/* 비밀번호 만들기는 아직 이 화면에서 저장되지 않아서, 마지막 로그인 방법은 백엔드 문장만 보인다 */
const UNLINK_ERRORS: Record<string, string> = {
  LAST_LOGIN_METHOD: "마지막 로그인 방법은 해제할 수 없어요",
  unlink: "연동을 해제하지 못했어요. 다시 시도해 주세요",
};

type Notice = { linked?: string; unlinked?: string; accountError?: string; unlinkError?: string };

const pick = (table: Record<string, string>, key: string, fallback: string) => (Object.hasOwn(table, key) ? table[key] : table[fallback]);

function message(notice: Notice): { status: "success" | "error"; text: string } | null {
  const label = (id?: string) => ACCOUNTS.find((account) => account.id === id)?.label;
  if (label(notice.linked)) return { status: "success", text: `${label(notice.linked)} 계정을 연동했어요` };
  if (label(notice.unlinked)) return { status: "success", text: `${label(notice.unlinked)} 연동을 해제했어요` };
  if (notice.accountError) return { status: "error", text: pick(LINK_ERRORS, notice.accountError, "oauth") };
  if (notice.unlinkError) return { status: "error", text: pick(UNLINK_ERRORS, notice.unlinkError, "unlink") };
  return null;
}

/** 연동된 로그인 방식(#84). 제공자마다 카드 한 장. 연동은 동의 화면을 거치고, 해제는 바로 한다 */
export function LinkedAccounts({
  providers,
  emails,
  notice,
}: {
  providers: LoginProvider[];
  /** 연동한 계정의 이메일(#84-R4). 연동 전에 저장하지 않은 계정은 다음 소셜 로그인 때 채워진다 */
  emails: Partial<Record<LoginProvider, string>>;
  notice: Notice;
}) {
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
            const email = linked ? emails[account.provider] : undefined;
            return (
              <li key={account.id} className={styles.card} data-linked={linked}>
                <account.Icon aria-hidden size={28} weight="bold" className={styles.icon} />
                <span className={styles.name}>
                  {account.label}
                  {linked ? <Badge tone="accent">연동됨</Badge> : <span className={styles.state}>연동 안 됨</span>}
                </span>
                {email ? (
                  <p className={styles.email}>{email}</p>
                ) : (
                  <p className={styles.hint}>{linked ? `${account.label}로도 로그인할 수 있어요` : `연동하면 ${account.label}로도 로그인해요`}</p>
                )}
                <form action={linked ? unlinkSocialAccount : linkSocialAccount} className={styles.form}>
                  <input type="hidden" name="provider" value={account.id} />
                  <Button type="submit" size="sm" className={styles.button} aria-label={`${account.label} ${linked ? "연동 해제" : "연동하기"}`}>
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
