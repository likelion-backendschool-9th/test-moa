import type { Session } from "@/lib/session";

/** 카테고리 탭. test-moa/docs/page-urls.md의 섹션 순서를 따른다. */
type NavDefinition = {
  label: string;
  path: string;
  requiresAuth?: boolean;
  adminOnly?: boolean;
};

const NAV: NavDefinition[] = [
  { label: "홈", path: "/" },
  { label: "테스트 모집", path: "/recruitments" },
  { label: "참여 테스트", path: "/my/participations", requiresAuth: true },
  { label: "내 프로젝트", path: "/my/projects", requiresAuth: true },
  { label: "채팅", path: "/my/chats", requiresAuth: true },
  { label: "마이페이지", path: "/my", requiresAuth: true },
  { label: "운영자 페이지", path: "/admin", adminOnly: true },
];

export type NavItem = {
  label: string;
  /** 현재 탭 판별에 쓰는 경로 */
  path: string;
  /** 실제 이동 주소. 비로그인이면 보호 탭은 로그인으로 보낸다 */
  href: string;
};

export function getNavItems(session: Session | null): NavItem[] {
  const role = session?.role ?? "tester";
  return NAV.filter((item) => !item.adminOnly || role === "admin").map((item) => ({
    label: item.label,
    path: item.path,
    href: item.requiresAuth && role === "guest" ? `/login?next=${encodeURIComponent(item.path)}` : item.path,
  }));
}

/** 가장 길게 일치하는 탭 하나를 현재 탭으로 본다 */
export function findActivePath(items: NavItem[], pathname: string) {
  return items
    .map((item) => item.path)
    .filter((path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)))
    .sort((a, b) => b.length - a.length)[0];
}
