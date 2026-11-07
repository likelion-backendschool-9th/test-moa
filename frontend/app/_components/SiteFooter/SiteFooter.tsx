import { Container } from "@/components/ui/Container/Container";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./SiteFooter.module.css";

/** 사이트 푸터 마크업. 오류 화면에서도 사용할 수 있게 서버 전용 코드를 import하지 않는다. */
export function SiteFooter({ children }: { children?: ReactNode }) {
  return (
    <footer data-site-footer className={styles.root}>
      <Container className={styles.container}>
        <div className={styles.box}>
          <p className={styles.text}>Test Moa</p>
          <p className={styles.text2}>개발자와 테스터를 연결하는 소프트웨어 테스터 모집 플랫폼</p>
        </div>
        <nav aria-label="약관" className={styles.nav}>
          <Link href="/terms" className={styles.link}>
            이용약관
          </Link>
          <Link href="/privacy" className={styles.link2}>
            개인정보처리방침
          </Link>
        </nav>
      </Container>
      {children}
    </footer>
  );
}
