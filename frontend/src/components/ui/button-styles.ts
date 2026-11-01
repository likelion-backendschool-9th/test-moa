import { cn } from "@/lib/cn";

/** strong: 먹 바탕 버튼. 되돌리기 어려운 행동(삭제 확인)처럼 강조색을 쓰면 안 되는 무거운 행동에 쓴다 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "strong";
export type ButtonSize = "md" | "sm";
/** pill: 기본 알약. field: 금액·계좌 입력 폼 안에서 입력란과 맞춘 12px 모서리 (DESIGN.md The Money Field Rule) */
export type ButtonShape = "pill" | "field";

const base =
  "inline-flex items-center justify-center gap-2 font-bold transition-[background-color,color,transform] duration-300 ease-brand active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:opacity-90",
  secondary: "bg-surface-strong text-text hover:bg-line",
  ghost: "text-text hover:bg-surface-strong",
  strong: "bg-text text-surface hover:opacity-90",
};

const sizes: Record<ButtonSize, string> = {
  md: "px-5 py-3 text-base",
  sm: "px-4 py-2 text-sm",
};

const shapes: Record<ButtonShape, string> = {
  pill: "rounded-full",
  field: "rounded-xl",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string, shape: ButtonShape = "pill") {
  return cn(base, variants[variant], sizes[size], shapes[shape], className);
}
