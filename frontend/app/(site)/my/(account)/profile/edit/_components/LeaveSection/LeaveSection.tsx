import { SettingsBody, SettingsSection } from "@/components/ui/SettingsCard/SettingsCard";
import type { LeaveNotice } from "@/features/member/types";
import { AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import { LeaveAccountButton } from "@/app/(site)/my/(account)/_components/LeaveAccountButton/LeaveAccountButton";
import styles from "./LeaveSection.module.css";

/** 회원 탈퇴 줄(#84, D안). 찾기 쉽게 다른 줄과 같은 모양으로 두고, 되돌리기 어려워서 맨 아래에 둔다 */
export function LeaveSection({ notice }: { notice: LeaveNotice }) {
  return (
    <SettingsSection aria-labelledby="leave-heading">
      <div className={styles.box}>
        <AccountCardTitle id="leave-heading">회원 탈퇴</AccountCardTitle>
        <p className={styles.text}>탈퇴해도 30일 안에는 되돌릴 수 있어요.</p>
      </div>
      <SettingsBody className={styles.body}>
        <p className={styles.text}>30일이 지나면 개인정보가 전부 사라지고 남은 크레딧도 사라져요.</p>
        <div className={styles.action}>
          <LeaveAccountButton {...notice} />
        </div>
      </SettingsBody>
    </SettingsSection>
  );
}
