import type { ComponentProps, ElementType } from "react";
import { Card, type CardProps } from "@/components/ui/Card/Card";
import { cn } from "@/lib/cn";
import styles from "./SettingsCard.module.css";

/*
 * 설정 화면(개인정보 수정). 한 장의 면을 줄로 나누고, 넓은 화면에서는 제목·설명을 왼쪽 1/3, 칸을 오른쪽 2/3에 둔다.
 * 칸이 화면 너비만큼 늘어나 빈 곳이 생기지 않게 칸은 한 열로 쌓는다
 */
export function SettingsCard<T extends ElementType = "div">({ className, ...props }: CardProps<T>) {
  return <Card {...(props as object)} className={cn(styles.root, className)} />;
}

/** 면 안의 한 구역 */
export function SettingsSection<T extends ElementType = "section">({ as, className, ...props }: { as?: T } & Omit<ComponentProps<T>, "as">) {
  const Tag: ElementType = as ?? "section";
  return <Tag {...props} className={cn(styles.section, className)} />;
}

/** 오른쪽 2/3 칸 묶음 */
export function SettingsBody({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn(styles.body, className)} />;
}
