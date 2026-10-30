import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { getNavItems } from "@/lib/nav";
import { getSession, type Session } from "@/lib/session";
import { HeaderSearch } from "./HeaderSearch";
import { MainNav } from "./MainNav";
import { MobileMenu, type AccountLink } from "./MobileMenu";
import { NavList } from "./NavList";
import { UserMenu } from "./UserMenu";

/*
 * 사이트 이름과 탭은 정적 셸에 들어가고, 세션을 읽는 부분만 Suspense 안에서 스트리밍된다.
 * 세션을 읽기 전에는 일반 사용자 기준 탭을 보여 준다.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-(--z-header) border-b border-line bg-surface">
      <Container className="flex flex-wrap items-center gap-x-6 gap-y-1 py-3 xl:flex-nowrap">
        <Link href="/" aria-label="Test Moa" className="text-2xl font-extrabold tracking-[-0.04em]">
          test moa
        </Link>
        <Suspense fallback={<NavList items={getNavItems(null)} />}>
          <MainNavSlot />
        </Suspense>
        <HeaderSearch className="hidden md:block xl:ml-auto" />
        <div className="ml-auto flex items-center gap-2 xl:ml-0">
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
  return <MobileMenu items={getNavItems(session)} accountLinks={getAccountLinks(session)} />;
}

/** 모바일 헤더에서 숨긴 계정 링크를 메뉴 패널에 넣는다 */
function getAccountLinks(session: Session): AccountLink[] {
  if (session.user === null) return [];
  return [{ label: "내 정보", href: "/my/profile/edit" }];
}
