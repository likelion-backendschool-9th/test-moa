import { PROJECTS_PATH } from "@/lib/project-paths";
import type { Session } from "@/lib/session";

/** 카테고리 탭. test-moa/docs/page-urls.md의 섹션 순서를 따른다. */
type NavDefinition = {
  label: string;
  path: string;
  activePaths?: string[];
  requiresAuth?: boolean;
  adminOnly?: boolean;
};

/* 홈은 로고로, 마이페이지는 헤더 오른쪽 계정 영역으로 간다. 모집 글 검색은 홈 전체 테스트 그리드에서 한다 */
const NAV: NavDefinition[] = [
  { label: "참여 테스트", path: "/testers/recruitments", requiresAuth: true },
  { label: "내 프로젝트", path: PROJECTS_PATH, activePaths: [PROJECTS_PATH, "/developer/recruitments"], requiresAuth: true },
  { label: "채팅", path: "/my/chats", requiresAuth: true },
  { label: "운영자 페이지", path: "/admin", adminOnly: true },
];

export type NavItem = {
  label: string;
  /** 현재 탭 판별에 쓰는 경로 */
  path: string;
  activePaths?: string[];
  /** 실제 이동 주소. 비로그인이면 보호 탭은 로그인으로 보낸다 */
  href: string;
};

export function getNavItems(session: Session | null): NavItem[] {
  const role = session?.role ?? "tester";
  return NAV.filter((item) => !item.adminOnly || role === "admin").map((item) => ({
    label: item.label,
    path: item.path,
    activePaths: item.activePaths,
    href: item.requiresAuth && role === "guest" ? `/login?next=${encodeURIComponent(item.path)}` : item.path,
  }));
}

/** 가장 길게 일치하는 탭 하나를 현재 탭으로 본다 */
export function findActivePath(items: NavItem[], pathname: string) {
  return items
    .flatMap((item) => (item.activePaths ?? [item.path]).map((path) => ({ item, path })))
    .filter(({ path }) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)))
    .sort((a, b) => b.path.length - a.path.length)[0]?.item.path;
}

export const MY_PAGE_PATH = "/my";
const CREDITS_PATH = "/my/credits";

const isUnder = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

/** 헤더 "마이페이지"가 현재 위치인지. 마이페이지 아래라도 탭이 따로 있는 곳과 크레딧(별도 버튼)은 뺀다 */
export function isMyPagePath(pathname: string) {
  if (!isUnder(pathname, MY_PAGE_PATH) || isUnder(pathname, CREDITS_PATH)) return false;
  return !NAV.some((item) => item.path !== MY_PAGE_PATH && isUnder(item.path, MY_PAGE_PATH) && isUnder(pathname, item.path));
}
