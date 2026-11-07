import { Container } from "@/components/ui/Container/Container";
import { AccountNav } from "@/app/(site)/my/(account)/_components/AccountNav/AccountNav";
import styles from "./layout.module.css";

/* 마이페이지 하위 페이지 공통 틀. 참여 테스트·내 프로젝트·채팅은 이 그룹 밖이라 메뉴가 없다 */
export default function AccountLayout({ children }: LayoutProps<"/my">) {
  return (
    <Container className={styles.accountLayout}>
      <aside className={styles.accountLayoutAside}>
        <AccountNav />
      </aside>
      <div className={styles.accountLayoutChildren}>{children}</div>
    </Container>
  );
}
