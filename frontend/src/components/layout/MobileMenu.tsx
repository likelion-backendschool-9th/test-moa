"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { findActivePath, type NavItem } from "@/lib/nav";
import { HeaderSearch } from "./HeaderSearch";

export type AccountLink = { label: string; href: string };

type MobileMenuProps = {
  items: NavItem[];
  accountLinks: AccountLink[];
};

export function MobileMenu({ items, accountLinks }: MobileMenuProps) {
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
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [...items.map((item) => ({ ...item, active: item.path === activePath })), ...accountLinks.map((link) => ({ ...link, path: link.href, active: false }))];

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
            <HeaderSearch className="mb-6 max-w-none" onSearch={() => setOpen(false)} />
            <nav aria-label="모바일 메뉴">
              <ul className="stagger-children flex flex-col gap-1">
                {links.map((link) => (
                  <li key={link.href} className="animate-rise-in">
                    <Link
                      href={link.href}
                      aria-current={link.active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex rounded-lg px-3 py-3 text-xl font-semibold",
                        link.active ? "bg-accent-soft text-accent" : "hover:bg-surface-strong",
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>,
          document.body,
        )}
    </>
  );
}
