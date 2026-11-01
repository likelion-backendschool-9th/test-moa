"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { logout } from "@/features/auth/actions";
import { cn } from "@/lib/cn";
import { findActivePath, isMyPagePath, MY_PAGE_PATH, type NavItem } from "@/lib/nav";

type MobileMenuProps = {
  items: NavItem[];
  /** 로그인했으면 헤더에서 숨긴 마이페이지·로그아웃을 패널에 넣는다 */
  isMember: boolean;
};

const itemClass = "flex w-full rounded-lg px-3 py-3 text-xl font-semibold";

/** 좁은 화면 메뉴 버튼과 전체 높이 패널 */
export function MobileMenu({ items, isMember }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const activePath = findActivePath(items, pathname);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    /* 패널 밖 헤더 로고처럼 어떤 링크를 눌러도 닫는다. 이미 홈에서 로고를 눌러 주소가 그대로여도 닫힌다 */
    function onClick(event: MouseEvent) {
      if (event.target instanceof Element && event.target.closest("a[href]")) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = items.map((item) => ({ label: item.label, href: item.href, active: item.path === activePath }));
  if (isMember) links.push({ label: "마이페이지", href: MY_PAGE_PATH, active: isMyPagePath(pathname) });

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex size-10 items-center justify-center rounded-lg hover:bg-surface-strong md:hidden"
      >
        <span
          aria-hidden
          className={cn(
            "absolute h-0.5 w-5 rounded-full bg-text transition-transform duration-500 ease-brand",
            open ? "rotate-45" : "-translate-y-1",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "absolute h-0.5 w-5 rounded-full bg-text transition-transform duration-500 ease-brand",
            open ? "-rotate-45" : "translate-y-1",
          )}
        />
      </button>
      {open &&
        createPortal(
          <div
            id="mobile-menu"
            data-testid="mobile-menu"
            className="fixed inset-0 z-(--z-menu) h-dvh overflow-y-auto bg-surface/95 px-4 pt-24 pb-8 backdrop-blur-xl md:hidden"
          >
            <nav aria-label="모바일 메뉴">
              <ul className="stagger-children flex flex-col gap-1">
                {links.map((link) => (
                  <li key={link.href} className="animate-rise-in">
                    <Link
                      href={link.href}
                      aria-current={link.active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(itemClass, link.active ? "bg-accent-soft text-accent" : "hover:bg-surface-strong")}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {isMember && (
                  <li className="animate-rise-in">
                    {/* 로그아웃 뒤 홈으로 가므로 제출과 함께 패널을 닫는다 */}
                    <form action={logout} onSubmit={() => setOpen(false)}>
                      <button type="submit" className={cn(itemClass, "text-text-muted hover:bg-surface-strong")}>
                        로그아웃
                      </button>
                    </form>
                  </li>
                )}
              </ul>
            </nav>
          </div>,
          document.body,
        )}
    </>
  );
}
