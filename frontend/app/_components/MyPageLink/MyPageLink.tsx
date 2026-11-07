"use client";

import { usePathname } from "next/navigation";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { cn } from "@/lib/cn";
import { isMyPagePath, MY_PAGE_PATH } from "@/app/_lib/nav";

/** 헤더 오른쪽 "마이페이지". 현재 위치를 표시하려고 경로를 읽는다 */
export function MyPageLink({ className }: { className?: string }) {
  const active = isMyPagePath(usePathname());
  return (
    <LinkButton
      href={MY_PAGE_PATH}
      variant="ghost"
      size="sm"
      aria-current={active ? "page" : undefined}
      className={cn("whitespace-nowrap", active && "bg-surface-strong", className)}
    >
      마이페이지
    </LinkButton>
  );
}
