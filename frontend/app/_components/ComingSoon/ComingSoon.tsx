import { Container } from "@/components/ui/Container/Container";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { cn } from "@/lib/cn";
import styles from "./ComingSoon.module.css";

/** 아직 만들지 않은 페이지. 홈의 링크가 404로 끝나지 않게 한다 */
export function ComingSoon({ pageName }: { pageName: string }) {
  return (
    <Container className={styles.root}>
      <ComingSoonContent pageName={pageName} />
    </Container>
  );
}

/** 바깥 틀(Container)이 이미 있는 자리에 쓰는 준비 중 내용. 마이페이지 메뉴 옆 본문이 그렇다 */
export function ComingSoonContent({ pageName, className }: { pageName: string; className?: string }) {
  return (
    <div className={cn(styles.comingSoonContent, className)}>
      <p className={styles.comingSoonContentPageName}>{pageName}</p>
      <h1 className={styles.comingSoonContentTitle}>준비 중인 페이지예요</h1>
      <p className={styles.comingSoonContentText}>이 화면은 다음 작업에서 만들 예정이에요.</p>
      <LinkButton href="/" variant="secondary" className={styles.comingSoonContentButton}>
        홈으로
      </LinkButton>
    </div>
  );
}
