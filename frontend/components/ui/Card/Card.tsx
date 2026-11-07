import type { ComponentProps, ElementType } from "react";
import { cn } from "@/lib/cn";
import styles from "./Card.module.css";

type Radius = "lg" | "xl" | "2xl";

export type CardProps<T extends ElementType> = {
  /** 그릴 태그. 기본은 div */
  as?: T;
  /** 모서리. 기본은 2xl(16px) */
  radius?: Radius;
} & Omit<ComponentProps<T>, "as">;

const RADIUS: Record<Radius, string> = { lg: styles.radiusLg, xl: styles.radiusXl, "2xl": styles.radius2xl };

/**
 * 교정지 면(패널). 바탕, 모서리, 라이트 모드의 1px 테두리, 포커스 링만 정한다.
 * 안쪽 여백과 배치는 부르는 쪽의 className이 정한다. 이 부품이 정한 속성은 덮어쓰지 않는다(#160-R6)
 */
export function Card<T extends ElementType = "div">({ as, radius = "2xl", className, ...props }: CardProps<T>) {
  const Tag: ElementType = as ?? "div";
  return <Tag className={cn(styles.card, RADIUS[radius], className)} {...props} />;
}
