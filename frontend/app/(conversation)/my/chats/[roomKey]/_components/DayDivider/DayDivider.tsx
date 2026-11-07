import type { ComponentProps, ElementType } from "react";
import { cn } from "@/lib/cn";
import styles from "./DayDivider.module.css";

/** 날짜 구분. 가운데 흐린 먹 글자 양옆에 1px 재단 회색 선 */
export function DayDivider<T extends ElementType = "h2">({ as, className, ...props }: { as?: T } & Omit<ComponentProps<T>, "as">) {
  const Tag: ElementType = as ?? "h2";
  return <Tag {...props} className={cn(styles.root, className)} />;
}
