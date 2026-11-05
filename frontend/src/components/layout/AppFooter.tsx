import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { isBackendAuth } from "@/lib/backend";
import { getDemoDataMode } from "@/lib/demo";
import { getSession } from "@/lib/session";
import { DemoSwitcher } from "./DemoSwitcher";

/** 사이트 푸터. 채팅방처럼 HideFooter를 둔 화면이 보이는 동안에는 숨는다 */
export function AppFooter() {
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
      {process.env.NODE_ENV === "development" && (
        <Container className="pb-8">
          <Suspense fallback={null}>
            <DemoSwitcherSlot />
          </Suspense>
        </Container>
      )}
    </footer>
  );
}

async function DemoSwitcherSlot() {
  const [session, data] = await Promise.all([getSession(), getDemoDataMode()]);
  /* 실제 로그인(AUTH_MODE=backend)에서는 로그인·운영자는 백엔드가 정해서, 회원의 화면(테스터·개발자)만 고른다 */
  return <DemoSwitcher role={session.role} data={data} personaOnly={isBackendAuth} />;
}
