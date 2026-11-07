import { Container } from "@/components/ui/Container/Container";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import styles from "./NotFoundContent.module.css";

export default function NotFoundContent() {
  return (
    <Container className={styles.root}>
      <p className={styles.text}>404</p>
      <h1 className={styles.title}>찾는 페이지가 없어요</h1>
      <p className={styles.text2}>주소가 바뀌었거나 삭제된 페이지예요. 홈에서 다시 찾아 주세요.</p>
      <LinkButton href="/" variant="secondary" className={styles.button}>
        홈으로
      </LinkButton>
    </Container>
  );
}
