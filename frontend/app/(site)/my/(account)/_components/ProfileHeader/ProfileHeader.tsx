import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import type { Profile } from "@/features/member/types";
import { AccountCard } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./ProfileHeader.module.css";

/** 이름·닉네임·이메일. 개발자와 테스터는 한 계정이라 회원 유형은 표시하지 않는다 */
export function ProfileHeader({ profile }: { profile: Profile }) {
  const rows = [
    { label: "이름", value: profile.name },
    { label: "닉네임", value: profile.nickname },
    { label: "이메일", value: profile.email },
  ];
  return (
    <AccountCard as="section" aria-label="내 정보">
      <div className={styles.box}>
        <dl className={styles.list}>
          {rows.map((row) => (
            <div key={row.label} className={styles.root}>
              <dt className={styles.label}>{row.label}</dt>
              <dd className={styles.value}>{row.value}</dd>
            </div>
          ))}
        </dl>
        <LinkButton href="/my/profile/edit" variant="secondary" size="sm" className={styles.button}>
          개인정보 수정
        </LinkButton>
      </div>
    </AccountCard>
  );
}
