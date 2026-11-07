import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { getNavItems } from "@/app/_lib/nav";
import { getSession } from "@/features/session/session";
import { MainNav } from "./MainNav";
import { MobileMenu } from "./MobileMenu";
import { NavList } from "./NavList";
import { UserMenu } from "./UserMenu";

/*
 * 사이트 이름과 탭은 정적 셸에 들어가고, 세션을 읽는 부분만 Suspense 안에서 스트리밍된다.
 * 세션을 읽기 전에는 일반 사용자 기준 탭을 보여 준다. 1024px부터 로고·탭·계정 영역을 한 줄에 둔다.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-(--z-header) border-b border-line bg-surface">
      <Container className="flex flex-wrap items-center gap-x-6 gap-y-1 py-3 lg:flex-nowrap">
        {/* 글자 로고. moa만 강조색 (DESIGN.md 로고) */}
        <Link href="/" aria-label="Test Moa" className="text-2xl font-extrabold tracking-[-0.04em] whitespace-nowrap">
          test <span className="text-brand-logo">moa</span>
        </Link>
        <Suspense fallback={<NavList items={getNavItems(null)} />}>
          <MainNavSlot />
        </Suspense>
        <div className="ml-auto flex items-center gap-2">
          <Suspense fallback={<Skeleton className="h-9 w-32" />}>
            <UserMenuSlot />
          </Suspense>
          <Suspense fallback={<Skeleton className="size-10 md:hidden" />}>
            <MobileMenuSlot />
          </Suspense>
        </div>
      </Container>
    </header>
  );
}

async function UserMenuSlot() {
  return <UserMenu session={await getSession()} />;
}

async function MainNavSlot() {
  return <MainNav items={getNavItems(await getSession())} />;
}

async function MobileMenuSlot() {
  const session = await getSession();
  return <MobileMenu items={getNavItems(session)} isMember={session.user !== null} />;
}
