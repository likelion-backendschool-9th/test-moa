import type { ElementType } from "react";
import { Card, type CardProps } from "@/components/ui/Card/Card";
import { cn } from "@/lib/cn";
import styles from "./AdminPanel.module.css";

/** 운영자 화면의 정보 패널(신고·출금·회원 상세, 처리 폼, 오래 기다린 요청). 면은 Card가 그린다 */
export function AdminPanel<T extends ElementType = "div">({ className, ...props }: CardProps<T>) {
  return <Card {...(props as object)} className={cn(styles.root, className)} />;
}
