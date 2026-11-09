"use client";

import { useChatUnreadCount } from "../ChatEvents/hook";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { logout } from "@/features/auth/actions";
import { cn } from "@/lib/cn";
import { findActivePath, isMyPagePath, MY_PAGE_PATH, type NavItem } from "@/app/_lib/nav";
import styles from "./MobileMenu.module.css";

type MobileMenuProps = {
  items: NavItem[];
  /** 로그인했으면 헤더에서 숨긴 마이페이지·로그아웃을 패널에 넣는다 */
  isMember: boolean;
};

/** 좁은 화면 메뉴 버튼과 전체 높이 패널 */
export function MobileMenu({ items, isMember }: MobileMenuProps) {
  const count = useChatUnreadCount(items.find(item => item.path === "/my/chats")?.badge);
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

  const links = items.map((item) => ({ label: item.label, href: item.href, badge: item.badge, active: item.path === activePath }));
  if (isMember) links.push({ label: "마이페이지", href: MY_PAGE_PATH, badge: undefined, active: isMyPagePath(pathname) });

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        onClick={() => setOpen((value) => !value)}
        className={styles.button}
      >
        <span
          aria-hidden
          className={cn(styles.label, open ? styles.labelOpen : styles.labelNotOpen)}
        />
        <span
          aria-hidden
          className={cn(styles.label2, open ? styles.label2Open : styles.label2NotOpen)}
        />
      </button>
      {open &&
        createPortal(
          <div
            id="mobile-menu"
            data-testid="mobile-menu"
            className={styles.box}
          >
            <nav aria-label="모바일 메뉴">
              <ul className={styles.list}>
                {links.map((link) => (
                  <li key={link.href} className={styles.root}>
                    <Link
                      href={link.href}
                      aria-current={link.active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(styles.item, link.active ? styles.labelActive : styles.labelNotActive)}
                    >
                      {link.label}
                      {link.badge !== undefined && count > 0 && <span className={styles.badge} ><span aria-hidden>{count >= 100 ? "99+" : count}</span><span className={styles.srOnly}>{`안 읽은 메시지 ${count}개`}</span></span>}
                    </Link>
                  </li>
                ))}
                {isMember && (
                  <li className={styles.item2}>
                    {/* 로그아웃 뒤 홈으로 가므로 제출과 함께 패널을 닫는다 */}
                    <form action={logout} onSubmit={() => setOpen(false)}>
                      <button type="submit" className={cn(styles.item, styles.button2)}>
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
