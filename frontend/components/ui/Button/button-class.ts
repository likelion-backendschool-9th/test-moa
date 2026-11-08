import { cn } from "@/lib/cn";
import styles from "./Button.module.css";

/**
 * strong: 먹 바탕 버튼. 되돌리기 어려운 행동(삭제 확인)처럼 강조색을 쓰면 안 되는 무거운 행동에 쓴다.
 * paid: 유료 기능 그라데이션(--paid-gradient) 바탕. 글씨는 라이트에서 강조색, 다크에서 흰색이다(paid-text).
 *   유료 기능으로 이어지는 버튼(피드백의 채팅하기·AI 질문 받기)에 쓴다.
 * like: 피드백 "유용해요"를 누른 상태에만 쓴다.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "strong" | "paid" | "like";
export type ButtonSize = "md" | "sm";
/** pill: 기본 알약. field: 금액·계좌 입력 폼 안에서 입력란과 맞춘 12px 모서리 (DESIGN.md The Money Field Rule) */
export type ButtonShape = "pill" | "field";

const variants: Record<ButtonVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
  strong: styles.strong,
  paid: styles.paid,
  like: styles.like,
};

const sizes: Record<ButtonSize, string> = { md: styles.md, sm: styles.sm };

const shapes: Record<ButtonShape, string> = { pill: styles.pill, field: styles.field };

/** 버튼 모양의 클래스. Button·LinkButton과, 버튼처럼 보여야 하는 다른 요소(파일 선택 label)가 쓴다 */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string, shape: ButtonShape = "pill") {
  return cn(styles.base, variants[variant], sizes[size], shapes[shape], className);
}
