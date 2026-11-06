import { Suspense } from "react";
import { SiteFooter } from "@/app/_components/SiteFooter";
import { Container } from "@/components/ui/Container";
import { isBackendAuth } from "@/lib/backend";
import { getDemoDataMode } from "@/lib/demo";
import { getSession } from "@/lib/session";
import { DemoSwitcher } from "../../components/layout/DemoSwitcher";

/** 사이트 푸터와 개발용 시연 전환기. 푸터를 보여 주는 화면만 사용한다 */
export function AppFooter() {
  return (
    <SiteFooter>
      {process.env.NODE_ENV === "development" && (
        <Container className="pb-8">
          <Suspense fallback={null}>
            <DemoSwitcherSlot />
          </Suspense>
        </Container>
      )}
    </SiteFooter>
  );
}

async function DemoSwitcherSlot() {
  const [session, data] = await Promise.all([getSession(), getDemoDataMode()]);
  /* 실제 로그인(AUTH_MODE=backend)에서는 로그인·운영자는 백엔드가 정해서, 회원의 화면(테스터·개발자)만 고른다 */
  return <DemoSwitcher role={session.role} data={data} personaOnly={isBackendAuth} />;
}
