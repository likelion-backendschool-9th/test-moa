"use client";

import { usePathname } from "next/navigation";
import { findActivePath, type NavItem } from "@/app/_lib/nav";
import { NavList } from "../NavList/NavList";

export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return <NavList items={items} activePath={findActivePath(items, pathname)} />;
}
