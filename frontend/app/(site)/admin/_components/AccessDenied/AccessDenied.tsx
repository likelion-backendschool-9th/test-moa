import { Container } from "@/components/ui/Container/Container";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import styles from "./AccessDenied.module.css";

/** 로그인했지만 권한이 없는 페이지. ComingSoon과 같은 모양이다 */
export function AccessDenied({ pageName }: { pageName: string }) {
  return (
    <Container className={styles.root}>
      <p className={styles.pageName}>{pageName}</p>
      <h1 className={styles.title}>운영자만 볼 수 있는 페이지예요</h1>
      <p className={styles.text}>운영자 계정으로 로그인하면 이 화면을 볼 수 있어요.</p>
      <LinkButton href="/" variant="secondary" className={styles.button}>
        홈으로
      </LinkButton>
    </Container>
  );
}
