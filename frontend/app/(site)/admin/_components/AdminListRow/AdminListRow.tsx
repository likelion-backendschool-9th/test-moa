import type { ElementType } from "react";
import { Card, type CardProps } from "@/components/ui/Card/Card";
import { cn } from "@/lib/cn";
import styles from "./AdminListRow.module.css";

/** 운영자 목록(신고·출금·회원)의 한 줄. 좁은 화면은 세로로 쌓고 md부터 한 줄로 놓는다 */
export function AdminListRow<T extends ElementType = "div">({ className, ...props }: CardProps<T>) {
  return <Card {...(props as object)} className={cn(styles.root, className)} />;
}
