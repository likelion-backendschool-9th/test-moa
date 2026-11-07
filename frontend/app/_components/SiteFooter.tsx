import { Container } from "@/components/ui/Container";
import Link from "next/link";
import type { ReactNode } from "react";

/** 사이트 푸터 마크업. 오류 화면에서도 사용할 수 있게 서버 전용 코드를 import하지 않는다. */
export function SiteFooter({ children }: { children?: ReactNode }) {
  return (
    <footer data-site-footer className="mt-24 border-t border-line bg-surface-muted">
      <Container className="flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="font-semibold">Test Moa</p>
          <p className="text-sm text-text-muted">개발자와 테스터를 연결하는 소프트웨어 테스터 모집 플랫폼</p>
        </div>
        <nav aria-label="약관" className="flex gap-4 text-sm text-text-muted">
          <Link href="/terms" className="hover:text-text">
            이용약관
          </Link>
          <Link href="/privacy" className="hover:text-text">
            개인정보처리방침
          </Link>
        </nav>
      </Container>
      {children}
    </footer>
  );
}
