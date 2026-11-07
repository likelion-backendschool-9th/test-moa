import type { ComponentProps, ElementType } from "react";
import { Card, type CardProps } from "@/components/ui/Card/Card";
import { cn } from "@/lib/cn";
import styles from "./AccountCard.module.css";

/** 마이페이지 요약 카드. DESIGN.md의 패널(교정지 면, 16px, 안쪽 24px / md 32px)을 따른다 */
export function AccountCard<T extends ElementType = "div">({ className, ...props }: CardProps<T>) {
  return <Card {...(props as object)} className={cn(styles.root, className)} />;
}

/** 제목과 행동 버튼을 한 줄에 둔다 */
export function AccountCardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn(styles.header, className)} />;
}

export function AccountCardTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 {...props} className={cn(styles.title, className)} />;
}
